import { CutluyPaymentConfig, CutluyOrder } from "../types";
import {
  createUnifiedPaymentOrder,
  checkUnifiedPaymentStatus,
  verifyUnifiedOrder,
  testCutluyApiKey,
  getPaymentGatewaySettings,
  savePaymentGatewaySettings,
  getStoredPaymentOrders,
} from "./gatewayService";

export { testCutluyApiKey } from "./gatewayService";

const CUTLUY_CONFIG_STORAGE_KEY = "dramahub_cutluy_config";
const CUTLUY_ORDERS_STORAGE_KEY = "dramahub_cutluy_orders";

// Default Cutluy Configuration
export const DEFAULT_CUTLUY_CONFIG: CutluyPaymentConfig = {
  apiKey: "", // Store API key (ck_live_...)
  merchantId: "STORE_MERCHANT",
  baseUrl: "https://cutluy.com/v1",
  isLive: true,
  currency: "USD",
  webhookUrl: "https://urdrama.com/api/webhooks/cutluy",
};

export const getCutluyConfig = (): CutluyPaymentConfig => {
  return getPaymentGatewaySettings().cutluy;
};

export const saveCutluyConfig = (config: CutluyPaymentConfig): void => {
  const current = getPaymentGatewaySettings();
  savePaymentGatewaySettings({
    ...current,
    cutluy: config,
  });
};

export const getStoredOrders = (): CutluyOrder[] => {
  return getStoredPaymentOrders();
};

export const createCutluyPaymentOrder = async (
  amount: number,
  planName: string,
  userId: string
): Promise<CutluyOrder> => {
  return createUnifiedPaymentOrder(amount, planName, userId);
};

export const checkCutluyPaymentStatus = async (paymentId: string): Promise<string> => {
  return checkUnifiedPaymentStatus({ paymentId } as any);
};

export const verifyCutluyOrder = async (orderId: string): Promise<boolean> => {
  return verifyUnifiedOrder(orderId);
};

