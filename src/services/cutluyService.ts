import { CutluyPaymentConfig, CutluyOrder } from "../types";

const CUTLUY_CONFIG_STORAGE_KEY = "dramahub_cutluy_config";
const CUTLUY_ORDERS_STORAGE_KEY = "dramahub_cutluy_orders";

// Default Cutluy Configuration
export const DEFAULT_CUTLUY_CONFIG: CutluyPaymentConfig = {
  apiKey: "", // Store API key (ck_live_...)
  merchantId: "STORE_MERCHANT",
  baseUrl: "https://cutluy.com/v1",
  isLive: true,
  currency: "USD",
  webhookUrl: "",
};

export const getCutluyConfig = (): CutluyPaymentConfig => {
  try {
    const saved = localStorage.getItem(CUTLUY_CONFIG_STORAGE_KEY);
    return saved ? { ...DEFAULT_CUTLUY_CONFIG, ...JSON.parse(saved) } : DEFAULT_CUTLUY_CONFIG;
  } catch {
    return DEFAULT_CUTLUY_CONFIG;
  }
};

export const saveCutluyConfig = (config: CutluyPaymentConfig): void => {
  try {
    localStorage.setItem(CUTLUY_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error("Failed to save Cutluy config", err);
  }
};

export const getStoredOrders = (): CutluyOrder[] => {
  try {
    const saved = localStorage.getItem(CUTLUY_ORDERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const createCutluyPaymentOrder = async (
  amount: number,
  planName: string,
  userId: string
): Promise<CutluyOrder> => {
  const config = getCutluyConfig();
  const orderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const response = await fetch("/api/cutluy/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        reference_id: orderId,
        apiKey: config.apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "CutLuy payment creation failed.");
    }

    // CutLuy API response fields
    const paymentId = data.id;
    const checkoutUrl = data.checkout_url;
    const qrString = data.qr_string;
    const expiresAt = data.expires_at;

    const qrDataToEncode = qrString || checkoutUrl;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataToEncode)}`;

    const newOrder: CutluyOrder = {
      orderId,
      paymentId,
      amount,
      currency: "USD",
      planName,
      status: data.status === "paid" ? "completed" : "pending",
      checkoutUrl,
      shortLink: checkoutUrl,
      qrCodeUrl,
      qrString,
      createdAt: data.created_at || new Date().toISOString(),
      expiresAt,
      userId,
    };

    const existing = getStoredOrders();
    localStorage.setItem(CUTLUY_ORDERS_STORAGE_KEY, JSON.stringify([newOrder, ...existing]));

    return newOrder;
  } catch (err: any) {
    console.warn("CutLuy API Error:", err.message);
    throw err;
  }
};

export const checkCutluyPaymentStatus = async (paymentId: string): Promise<string> => {
  const config = getCutluyConfig();
  try {
    const res = await fetch(`/api/cutluy/check-payment/${paymentId}?apiKey=${encodeURIComponent(config.apiKey)}`);
    if (res.ok) {
      const data = await res.json();
      return data.status || "pending";
    }
  } catch (err) {
    console.error("Error checking CutLuy status:", err);
  }
  return "pending";
};

export const verifyCutluyOrder = async (orderId: string): Promise<boolean> => {
  const orders = getStoredOrders();
  const index = orders.findIndex((o) => o.orderId === orderId);

  if (index !== -1) {
    orders[index].status = "completed";
    localStorage.setItem(CUTLUY_ORDERS_STORAGE_KEY, JSON.stringify(orders));
    return true;
  }
  return false;
};

export const testCutluyApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  if (!apiKey || apiKey.trim().length < 3) {
    return { success: false, message: "Please enter your CutLuy API secret key (ck_live_...)." };
  }

  try {
    const res = await fetch("/api/cutluy/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 0.01,
        reference_id: `test_verify_${Date.now()}`,
        apiKey: apiKey.trim(),
      }),
    });

    const data = await res.json();

    if (res.ok && data.checkout_url) {
      return {
        success: true,
        message: "✅ Connection Successful! Valid CutLuy API Key (ck_live_...). Test payment link generated."
      };
    } else {
      if (res.status === 401) {
        return {
          success: false,
          message: "❌ Unauthorized (401): Missing or invalid CutLuy API key. Please check your key under CutLuy Dashboard → API keys."
        };
      }
      return {
        success: false,
        message: `CutLuy API returned: ${data.message || data.error || "Unknown error"}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to CutLuy servers: ${err.message}`
    };
  }
};
