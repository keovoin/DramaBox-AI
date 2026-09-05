export interface Episode {
  id: number;
  number: number;
  title: string;
  duration: string; // e.g. "1:45"
  videoUrl: string; // MP4 or m3u8
  isVip: boolean;
  thumbnailUrl?: string;
  views: string;
}

export interface Drama {
  id: string;
  title: string;
  tagline: string;
  synopsis: string;
  category: string; // e.g., "Revenge", "CEO", "Romance", "Billionaire", "Action", "Fantasy"
  rating: number;
  episodesCount: number;
  episodes: Episode[];
  posterUrl: string;
  bannerUrl: string;
  featured?: boolean;
  trending?: boolean;
  hidden?: boolean; // hidden from public catalog (still visible in admin)
  tags: string[];
  releaseYear: string;
  viewsCount: string;
  likesCount: string;
}

export interface StreamAnalysisResult {
  url: string;
  status: number;
  contentType: string;
  contentLengthBytes: string;
  isHLS: boolean;
  proxiedUrl: string;
}

export interface WatchHistoryItem {
  dramaId: string;
  epNumber: number;
  currentTime: number;
  durationSeconds: number;
  progressPercent: number;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  orderId?: string;
  planName: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  currency: string;
  purchasedAt: string;
  vipExpiresAt: string;
  status: 'completed';
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  authMethod: 'gmail' | 'phone';
  avatarUrl?: string;
  isVip: boolean;
  vipPlanName?: string;
  vipExpiresAt?: string;
  vipExpiryDate?: string;
  coins: number;
  createdAt: string;
  isBlocked?: boolean;
  blockedAt?: string;
  blockedReason?: string;
  transactions?: TransactionRecord[];
}

export interface CutluyPaymentConfig {
  apiKey: string;
  merchantId: string;
  baseUrl: string;
  isLive: boolean;
  currency: string;
  webhookUrl: string;
}

export interface SenghongStoreConfig {
  apiKey: string; // sk_...
  mode: 'bakong' | 'aba'; // bakong (15 min) or aba (180 sec)
  baseUrl: string; // https://senghongstore.com
}

export type PaymentGatewayType = 'cutluy' | 'senghongstore' | 'auto_fallback';

export interface PaymentGatewaySettings {
  activeGateway: PaymentGatewayType;
  cutluy: CutluyPaymentConfig;
  senghong: SenghongStoreConfig;
}

export interface CutluyOrder {
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  planName: string;
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'scanned';
  checkoutUrl: string;
  shortLink?: string;
  qrCodeUrl?: string;
  qrString?: string;
  qrImage?: string; // Direct image URL or base64 data
  gateway?: 'cutluy' | 'senghongstore';
  gatewayMode?: 'bakong' | 'aba';
  createdAt: string;
  expiresAt?: string;
  userId: string;
  errorMessage?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountApplied?: number;
  coins: number;
  period: string;
  popular?: boolean;
  features: string[];
}


