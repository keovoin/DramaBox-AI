import {
  PaymentGatewaySettings,
  CutluyPaymentConfig,
  SenghongStoreConfig,
  PaymentGatewayType,
  CutluyOrder
} from "../types";

export const GATEWAY_SETTINGS_STORAGE_KEY = "dramahub_payment_gateways_settings";
export const PAYMENT_ORDERS_STORAGE_KEY = "dramahub_unified_payment_orders";

export const DEFAULT_CUTLUY_CONFIG: CutluyPaymentConfig = {
  apiKey: "",
  merchantId: "STORE_MERCHANT",
  baseUrl: "https://cutluy.com/v1",
  isLive: true,
  currency: "USD",
  webhookUrl: "https://urdrama.com/api/webhooks/cutluy",
};

export const DEFAULT_SENGHONG_CONFIG: SenghongStoreConfig = {
  apiKey: "",
  mode: "bakong",
  baseUrl: "https://senghongstore.com",
};

export const DEFAULT_GATEWAY_SETTINGS: PaymentGatewaySettings = {
  activeGateway: "cutluy",
  cutluy: DEFAULT_CUTLUY_CONFIG,
  senghong: DEFAULT_SENGHONG_CONFIG,
};

export const getPaymentGatewaySettings = (): PaymentGatewaySettings => {
  try {
    const saved = localStorage.getItem(GATEWAY_SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_GATEWAY_SETTINGS,
        ...parsed,
        cutluy: { ...DEFAULT_CUTLUY_CONFIG, ...(parsed.cutluy || {}) },
        senghong: { ...DEFAULT_SENGHONG_CONFIG, ...(parsed.senghong || {}) },
      };
    }
    // Check legacy cutluy key
    const legacyCutluy = localStorage.getItem("dramahub_cutluy_config");
    if (legacyCutluy) {
      return {
        ...DEFAULT_GATEWAY_SETTINGS,
        cutluy: { ...DEFAULT_CUTLUY_CONFIG, ...JSON.parse(legacyCutluy) },
      };
    }
  } catch {
    // Fallback to default
  }
  return DEFAULT_GATEWAY_SETTINGS;
};

export const savePaymentGatewaySettings = (settings: PaymentGatewaySettings): void => {
  try {
    localStorage.setItem(GATEWAY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    // Backwards sync legacy key
    localStorage.setItem("dramahub_cutluy_config", JSON.stringify(settings.cutluy));
  } catch (err) {
    console.error("Failed to save gateway settings to localStorage", err);
  }
};

export const fetchServerGatewaySettings = async (adminEmail: string): Promise<PaymentGatewaySettings | null> => {
  try {
    const res = await fetch(`/api/admin/gateways-config?adminEmail=${encodeURIComponent(adminEmail)}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.error("Failed to fetch server gateway settings", err);
  }
  return null;
};

export const saveServerGatewaySettings = async (
  adminEmail: string,
  settings: PaymentGatewaySettings
): Promise<{ success: boolean; message: string }> => {
  try {
    // Also save locally
    savePaymentGatewaySettings(settings);

    const res = await fetch("/api/admin/gateways-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminEmail,
        activeGateway: settings.activeGateway,
        cutluy: settings.cutluy,
        senghong: settings.senghong,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to save gateway settings on server" };
  }
};

export const getStoredPaymentOrders = (): CutluyOrder[] => {
  try {
    const saved = localStorage.getItem(PAYMENT_ORDERS_STORAGE_KEY) || localStorage.getItem("dramahub_cutluy_orders");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const createUnifiedPaymentOrder = async (
  amount: number,
  planName: string,
  userId: string,
  targetGateway?: PaymentGatewayType,
  preferredMode?: "bakong" | "aba"
): Promise<CutluyOrder> => {
  const settings = getPaymentGatewaySettings();
  const activeG = targetGateway || settings.activeGateway;

  const orderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const response = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        planName,
        referenceId: orderId,
        targetGateway: activeG,
        preferredMode: preferredMode || settings.senghong.mode,
        apiKey: activeG === "senghongstore" ? settings.senghong.apiKey : settings.cutluy.apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || data.error || "Payment creation failed.");
      if (data.owner_note) {
        (err as any).owner_note = data.owner_note;
      }
      throw err;
    }

    const newOrder: CutluyOrder = {
      orderId: data.orderId || orderId,
      paymentId: data.paymentId || data.id,
      amount,
      currency: data.currency || "USD",
      planName,
      status: data.status === "completed" || data.status === "paid" ? "completed" : "pending",
      checkoutUrl: data.checkoutUrl || data.checkout_url,
      shortLink: data.shortLink || data.checkoutUrl,
      qrCodeUrl: data.qrCodeUrl,
      qrString: data.qrString || data.qr,
      qrImage: data.qrImage || data.qr_image,
      gateway: data.gateway || (activeG === "senghongstore" ? "senghongstore" : "cutluy"),
      gatewayMode: data.gatewayMode || preferredMode || settings.senghong.mode,
      createdAt: data.createdAt || new Date().toISOString(),
      expiresAt: data.expiresAt,
      userId,
    };

    const existing = getStoredPaymentOrders();
    localStorage.setItem(PAYMENT_ORDERS_STORAGE_KEY, JSON.stringify([newOrder, ...existing]));
    // Sync legacy storage
    localStorage.setItem("dramahub_cutluy_orders", JSON.stringify([newOrder, ...existing]));

    return newOrder;
  } catch (err: any) {
    console.warn("Unified Payment API Error:", err.message);
    throw err;
  }
};

export const checkUnifiedPaymentStatus = async (order: CutluyOrder): Promise<string> => {
  if (!order.paymentId) return "pending";

  const settings = getPaymentGatewaySettings();
  const gateway = order.gateway || (settings.activeGateway === "senghongstore" ? "senghongstore" : "cutluy");
  const apiKey = gateway === "senghongstore" ? settings.senghong.apiKey : settings.cutluy.apiKey;

  try {
    const res = await fetch(`/api/payment/check-status/${gateway}/${encodeURIComponent(order.paymentId)}?apiKey=${encodeURIComponent(apiKey)}`);
    if (res.ok) {
      const data = await res.json();
      return (data.status || "pending").toLowerCase();
    }
  } catch (err) {
    console.error("Error checking payment status:", err);
  }
  return "pending";
};

export const verifyUnifiedOrder = async (orderId: string): Promise<boolean> => {
  const orders = getStoredPaymentOrders();
  const index = orders.findIndex((o) => o.orderId === orderId);

  if (index !== -1) {
    orders[index].status = "completed";
    localStorage.setItem(PAYMENT_ORDERS_STORAGE_KEY, JSON.stringify(orders));
    localStorage.setItem("dramahub_cutluy_orders", JSON.stringify(orders));
    return true;
  }
  return false;
};

export const testCutluyApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  try {
    const uStr = localStorage.getItem("dramahub_user");
    const user = uStr ? JSON.parse(uStr) : null;
    const adminEmail = user?.email || "keovoin@gmail.com";

    const res = await fetch("/api/admin/cutluy-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminEmail, apiKey: apiKey.trim() }),
    });

    return await res.json();
  } catch (err: any) {
    return { success: false, message: `CutLuy test failed: ${err.message}` };
  }
};

export const testSenghongApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  try {
    const uStr = localStorage.getItem("dramahub_user");
    const user = uStr ? JSON.parse(uStr) : null;
    const adminEmail = user?.email || "keovoin@gmail.com";

    const res = await fetch("/api/admin/senghong-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminEmail, apiKey: apiKey.trim() }),
    });

    return await res.json();
  } catch (err: any) {
    return { success: false, message: `SenghongStore test failed: ${err.message}` };
  }
};
