import React, { useState, useEffect } from "react";
import { 
  X, 
  CreditCard, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck, 
  Crown,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Key,
  Save,
  Clock,
  Zap,
  QrCode,
  Smartphone
} from "lucide-react";
import { CutluyOrder, SubscriptionPlan, UserProfile, PaymentGatewayType } from "../types";
import {
  getPaymentGatewaySettings,
  createUnifiedPaymentOrder,
  checkUnifiedPaymentStatus,
  verifyUnifiedOrder,
  saveServerGatewaySettings,
  savePaymentGatewaySettings
} from "../services/gatewayService";

interface CutluyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  user: UserProfile | null;
  onPaymentSuccess: (plan: SubscriptionPlan) => void;
  initialGateway?: PaymentGatewayType;
  initialMode?: "bakong" | "aba";
}

export const CutluyPaymentModal: React.FC<CutluyPaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  user,
  onPaymentSuccess,
  initialGateway,
  initialMode,
}) => {
  const savedSettings = getPaymentGatewaySettings();

  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>(
    initialGateway || (savedSettings.activeGateway === "senghongstore" ? "senghongstore" : "cutluy")
  );
  const [selectedMode, setSelectedMode] = useState<"bakong" | "aba">(
    initialMode || savedSettings.senghong.mode || "bakong"
  );

  const [currentOrder, setCurrentOrder] = useState<CutluyOrder | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [paymentDone, setPaymentDone] = useState<boolean>(false);

  // Expiration countdown state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  // Admin Quick Key Config State
  const [quickCutluyKey, setQuickCutluyKey] = useState<string>("");
  const [quickSenghongKey, setQuickSenghongKey] = useState<string>("");
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [keySavedNotice, setKeySavedNotice] = useState<string | null>(null);

  const isAdmin = user?.email === "keovoin@gmail.com" || user?.id?.startsWith("usr_admin");

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialGateway) setSelectedGateway(initialGateway);
      if (initialMode) setSelectedMode(initialMode);
      setPaymentDone(false);
      setErrorMessage(null);
      setCurrentOrder(null);
    }
  }, [isOpen, initialGateway, initialMode]);

  // Order creation on modal open or gateway switch
  const handleInitiateOrder = async (
    targetG: PaymentGatewayType = selectedGateway,
    targetM: "bakong" | "aba" = selectedMode
  ) => {
    setIsCreating(true);
    setErrorMessage(null);
    setPaymentDone(false);

    try {
      const order = await createUnifiedPaymentOrder(
        plan.price,
        plan.name,
        user?.id || "guest_user",
        targetG,
        targetM
      );
      setCurrentOrder(order);

      // Initialize countdown timer
      const totalSeconds = targetG === "senghongstore" && targetM === "aba" ? 180 : 900; // 180s for ABA, 15m for Bakong
      setTimeLeftSeconds(totalSeconds);
    } catch (err: any) {
      console.error("Order creation error:", err);
      if (isAdmin && err.owner_note) {
        setErrorMessage(`❌ Admin Notice: ${err.owner_note} (${err.message})`);
      } else {
        setErrorMessage(
          err.message || "Payment service is currently unavailable. Please verify API configuration or try another gateway."
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-initiate order on open
  useEffect(() => {
    if (isOpen && !currentOrder && !isCreating) {
      handleInitiateOrder(selectedGateway, selectedMode);
    }
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (!currentOrder || paymentDone || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentOrder, paymentDone, timeLeftSeconds]);

  // Auto-poll payment status every 2.5s
  useEffect(() => {
    if (!currentOrder?.paymentId || paymentDone) return;

    const interval = setInterval(async () => {
      try {
        const status = await checkUnifiedPaymentStatus(currentOrder);
        if (status === "paid" || status === "completed") {
          setPaymentDone(true);
          await verifyUnifiedOrder(currentOrder.orderId);
          setTimeout(() => {
            onPaymentSuccess(plan);
            onClose();
          }, 1500);
        }
      } catch (err) {
        console.error("Polling payment status error:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentOrder, paymentDone, plan, onPaymentSuccess, onClose]);

  if (!isOpen) return null;

  // Format seconds as MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Switch Gateway tab
  const handleSelectGatewayTab = (gateway: PaymentGatewayType, mode: "bakong" | "aba" = "bakong") => {
    setSelectedGateway(gateway);
    setSelectedMode(mode);
    setCurrentOrder(null);
    setErrorMessage(null);
    handleInitiateOrder(gateway, mode);
  };

  // Check or Confirm Payment
  const handleConfirmPayment = async () => {
    if (!currentOrder) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const realStatus = await checkUnifiedPaymentStatus(currentOrder);
      setIsVerifying(false);

      if (realStatus === "paid" || realStatus === "completed") {
        setPaymentDone(true);
        await verifyUnifiedOrder(currentOrder.orderId);
        setTimeout(() => {
          onPaymentSuccess(plan);
          onClose();
        }, 1200);
        return;
      }

      if (realStatus === "scanned") {
        setErrorMessage("📱 Payment detected! Please complete authorization in your mobile banking app.");
      } else if (realStatus === "expired" || timeLeftSeconds === 0) {
        setErrorMessage("⏰ Payment session expired. Please click 'Regenerate QR' below.");
      } else {
        setErrorMessage(`⏳ Status is "${realStatus}". Payment has not been received yet. Please scan the QR code with your banking app.`);
      }
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err.message || "Failed to query status.");
    }
  };

  // Admin Quick Key Saver
  const handleSaveQuickKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKey(true);
    setKeySavedNotice(null);
    setErrorMessage(null);

    const currentConfig = getPaymentGatewaySettings();
    const updated = {
      ...currentConfig,
      cutluy: {
        ...currentConfig.cutluy,
        apiKey: quickCutluyKey.trim() || currentConfig.cutluy.apiKey,
      },
      senghong: {
        ...currentConfig.senghong,
        apiKey: quickSenghongKey.trim() || currentConfig.senghong.apiKey,
      },
    };

    try {
      savePaymentGatewaySettings(updated);
      await saveServerGatewaySettings(user?.email || "keovoin@gmail.com", updated);
      setKeySavedNotice("✅ Secret key saved! Re-generating payment QR...");
      setIsSavingKey(false);
      handleInitiateOrder(selectedGateway, selectedMode);
    } catch (err: any) {
      setErrorMessage(`Failed to save key: ${err.message}`);
      setIsSavingKey(false);
    }
  };

  // Admin Force Activate (Testing)
  const handleForceActivate = async () => {
    if (!isAdmin || !currentOrder) return;
    setIsVerifying(true);
    await verifyUnifiedOrder(currentOrder.orderId);
    setIsVerifying(false);
    setPaymentDone(true);
    setTimeout(() => {
      onPaymentSuccess(plan);
      onClose();
    }, 1000);
  };

  const handleCopyLink = () => {
    const toCopy = currentOrder?.checkoutUrl || currentOrder?.qrString;
    if (toCopy) {
      navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-5 text-gray-200 relative shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Checkout VIP Subscription
          </h2>
          <p className="text-xs text-gray-400">
            Scan & pay instantly with any Cambodian Banking App (Bakong, ABA, ACLEDA)
          </p>
        </div>

        {/* Admin-only Switcher Controls (Hidden from standard users) */}
        {isAdmin && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Gateway Testing Switch</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Active: {selectedGateway}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#181818] rounded-xl border border-white/5">
              {/* CutLuy Tab */}
              <button
                type="button"
                onClick={() => handleSelectGatewayTab("cutluy", "bakong")}
                className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  selectedGateway === "cutluy"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <div className="text-[11px] font-bold">CutLuy</div>
                <div className="text-[9px] opacity-80">KHQR (15m)</div>
              </button>

              {/* SenghongStore Bakong Tab */}
              <button
                type="button"
                onClick={() => handleSelectGatewayTab("senghongstore", "bakong")}
                className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  selectedGateway === "senghongstore" && selectedMode === "bakong"
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <div className="text-[11px] font-bold">Senghong</div>
                <div className="text-[9px] opacity-80">Bakong</div>
              </button>

              {/* SenghongStore ABA Tab */}
              <button
                type="button"
                onClick={() => handleSelectGatewayTab("senghongstore", "aba")}
                className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  selectedGateway === "senghongstore" && selectedMode === "aba"
                    ? "bg-cyan-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <div className="text-[11px] font-bold">Senghong</div>
                <div className="text-[9px] opacity-80">ABA (180s)</div>
              </button>
            </div>
          </div>
        )}

        {/* Selected Plan Summary */}
        <div className="bg-[#181818] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              Selected Item
            </span>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              {plan.name}
            </h3>
            <p className="text-[10px] text-gray-400">All 50,000+ Episodes • Ad-Free</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-white">${plan.price.toFixed(2)}</span>
            <span className="text-[10px] text-gray-400 block">{plan.period}</span>
          </div>
        </div>

        {keySavedNotice && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{keySavedNotice}</span>
          </div>
        )}

        {/* Error Notice & Inline Key Setup for Admin */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-xs text-red-300 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Payment Gateway Notice</span>
            </div>
            <p className="leading-relaxed text-[11px]">{errorMessage}</p>

            {/* Quick Inline API Key Setup for Admin */}
            {isAdmin && (
              <div className="bg-[#181818] p-3.5 rounded-xl border border-white/10 space-y-3 mt-2">
                <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Gateway Secret Key Config</span>
                </div>
                <form onSubmit={handleSaveQuickKeys} className="space-y-2">
                  {selectedGateway === "cutluy" ? (
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">
                        CutLuy Secret Key (ck_live_...)
                      </label>
                      <input
                        type="text"
                        value={quickCutluyKey}
                        onChange={(e) => setQuickCutluyKey(e.target.value)}
                        placeholder="ck_live_..."
                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1 font-bold">
                        SenghongStore Bearer Token (sk_...)
                      </label>
                      <input
                        type="text"
                        value={quickSenghongKey}
                        onChange={(e) => setQuickSenghongKey(e.target.value)}
                        placeholder="sk_..."
                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingKey}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Key & Generate QR</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Order Details & QR Rendering */}
        {isCreating ? (
          <div className="bg-[#181818] p-8 rounded-2xl border border-white/5 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs font-bold text-white">
              Connecting to {selectedGateway === "senghongstore" ? "SenghongStore" : "CutLuy"} API...
            </p>
            <p className="text-[10px] text-gray-400">
              Generating secure KHQR code for ${plan.price.toFixed(2)}
            </p>
          </div>
        ) : currentOrder ? (
          <div className="space-y-4">
            {paymentDone ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-2 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-base font-black text-white">Payment Received!</h3>
                <p className="text-xs text-emerald-300">Your VIP access has been successfully activated.</p>
              </div>
            ) : (
              <>
                {/* QR Code Container */}
                <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 text-center space-y-3">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-bold text-gray-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {isAdmin ? (
                        <span className="text-[11px] text-gray-400 font-mono">
                          Gateway: {currentOrder.gateway} ({currentOrder.gatewayMode || "bakong"})
                        </span>
                      ) : (
                        <span>Bakong KHQR Payment</span>
                      )}
                    </span>
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(timeLeftSeconds)}
                    </span>
                  </div>

                  {/* QR Image Box */}
                  <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-md relative">
                    {currentOrder.qrImage ? (
                      <img
                        src={currentOrder.qrImage.startsWith("data:") ? currentOrder.qrImage : `data:image/png;base64,${currentOrder.qrImage}`}
                        alt="KHQR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : currentOrder.qrCodeUrl ? (
                      <img
                        src={currentOrder.qrCodeUrl}
                        alt="KHQR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-24 h-24 text-gray-400" />
                    )}
                  </div>

                  <p className="text-[10px] text-gray-400">
                    Scan with <strong>Bakong, ABA Mobile, ACLEDA</strong> or any KHQR banking app
                  </p>

                  {/* Checkout Link / Deep link */}
                  {currentOrder.checkoutUrl && (
                    <div className="flex items-center gap-2 bg-[#121212] p-2 rounded-xl border border-white/10 text-xs font-mono text-gray-300">
                      <span className="truncate flex-1 text-left text-[10px] text-emerald-400">
                        {currentOrder.checkoutUrl}
                      </span>
                      <button
                        onClick={handleCopyLink}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                        title="Copy Checkout Link"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    {currentOrder.checkoutUrl ? (
                      <a
                        href={currentOrder.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Pay Link</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInitiateOrder()}
                        className="py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate</span>
                      </button>
                    )}

                    <button
                      onClick={handleConfirmPayment}
                      disabled={isVerifying}
                      className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>I Have Paid</span>
                    </button>
                  </div>

                  {/* Testing Bypass Option for Admin */}
                  {isAdmin && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={handleForceActivate}
                        className="text-[10px] text-gray-500 hover:text-emerald-400 underline cursor-pointer transition-colors"
                      >
                        Demo/Admin Mode: Force Activate VIP
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => handleInitiateOrder()}
            disabled={isCreating}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Generate KHQR Payment (${plan.price.toFixed(2)})</span>
          </button>
        )}

        {/* Security badge footer */}
        <div className="pt-2 text-center text-[10px] text-gray-500 flex items-center justify-center gap-1.5 border-t border-white/5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Official KHQR Payment • Instant VIP Activation</span>
        </div>
      </div>
    </div>
  );
};
