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
  AlertCircle
} from "lucide-react";
import { CutluyOrder, SubscriptionPlan, UserProfile } from "../types";
import { createCutluyPaymentOrder, verifyCutluyOrder, checkCutluyPaymentStatus, getCutluyConfig } from "../services/cutluyService";

interface CutluyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  user: UserProfile | null;
  onPaymentSuccess: (plan: SubscriptionPlan) => void;
}

export const CutluyPaymentModal: React.FC<CutluyPaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  user,
  onPaymentSuccess,
}) => {
  const [currentOrder, setCurrentOrder] = useState<CutluyOrder | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [paymentDone, setPaymentDone] = useState<boolean>(false);

  const config = getCutluyConfig();
  const isAdmin = user?.email === "keovoin@gmail.com";

  // Auto-poll payment status if an order with paymentId is active
  useEffect(() => {
    if (!currentOrder?.paymentId || paymentDone) return;

    const interval = setInterval(async () => {
      try {
        const status = await checkCutluyPaymentStatus(currentOrder.paymentId!);
        if (status === "paid") {
          setPaymentDone(true);
          await verifyCutluyOrder(currentOrder.orderId);
          setTimeout(() => {
            onPaymentSuccess(plan);
            onClose();
          }, 1500);
        }
      } catch (err) {
        console.error("Polling payment status error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentOrder, paymentDone, plan, onPaymentSuccess, onClose]);

  if (!isOpen) return null;

  // Initialize Cutluy Order
  const handleInitiateOrder = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const order = await createCutluyPaymentOrder(
        plan.price,
        plan.name,
        user?.id || "guest_user"
      );
      setCurrentOrder(order);
    } catch (err: any) {
      console.error("Cutluy order creation error:", err);
      if (isAdmin && err.owner_note) {
        setErrorMessage(`❌ Admin Notice: ${err.owner_note} (Technical details: ${err.message})`);
      } else if (err.owner_note) {
        // Normal user only sees the clean message, not the store owner note
        setErrorMessage(err.message || "The payment gateway is temporarily unconfigured. Please contact support.");
      } else {
        const baseMsg = err.message || "Failed to create CutLuy payment.";
        if (isAdmin) {
          setErrorMessage(`${baseMsg} Please check your API key under CutLuy Gateway tab.`);
        } else {
          setErrorMessage(`${baseMsg} Please try again later or contact support.`);
        }
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Check or Confirm Payment Completion with CutLuy API
  const handleConfirmPayment = async () => {
    if (!currentOrder) return;
    setIsVerifying(true);
    setErrorMessage(null);

    if (currentOrder.paymentId) {
      try {
        const realStatus = await checkCutluyPaymentStatus(currentOrder.paymentId);
        if (realStatus === "paid") {
          await verifyCutluyOrder(currentOrder.orderId);
          setIsVerifying(false);
          setPaymentDone(true);
          setTimeout(() => {
            onPaymentSuccess(plan);
            onClose();
          }, 1200);
          return;
        }

        setIsVerifying(false);
        if (realStatus === "scanned") {
          setErrorMessage("📱 Payment detected (Status: scanned)! Please confirm and authorize the transaction inside your banking app.");
        } else if (realStatus === "expired") {
          setErrorMessage("⏰ Payment QR has expired (~5 mins). Please generate a new payment link.");
        } else if (realStatus === "failed") {
          setErrorMessage("❌ Payment failed or was cancelled.");
        } else {
          setErrorMessage(`⏳ Payment status is "${realStatus}". CutLuy has not received the transfer yet. Please scan the QR with Bakong/banking app to complete payment.`);
        }
        return;
      } catch (err: any) {
        console.error("Status check error:", err);
      }
    }

    // When checking real API payment status and paymentId is present, we only unlock when status === "paid"
    setIsVerifying(false);
    if (isAdmin) {
      setErrorMessage("⚠️ Payment status has not been confirmed as 'paid' yet. Please complete payment via Bakong or banking app, or use testing bypass below.");
    } else {
      setErrorMessage("⚠️ Payment status has not been confirmed as 'paid' yet. Please complete payment via Bakong or banking app.");
    }
  };

  // Manual bypass/force activation for testing
  const handleForceActivate = async () => {
    if (!isAdmin || !currentOrder) return;
    setIsVerifying(true);
    await verifyCutluyOrder(currentOrder.orderId);
    setIsVerifying(false);
    setPaymentDone(true);
    setTimeout(() => {
      onPaymentSuccess(plan);
      onClose();
    }, 1000);
  };

  // Copy Cutluy Checkout Link
  const handleCopyLink = () => {
    if (currentOrder?.checkoutUrl) {
      navigator.clipboard.writeText(currentOrder.checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 text-gray-200 relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            CutLuy KHQR Payment
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Checkout via CutLuy Gateway
          </h2>
          <p className="text-xs text-gray-400">
            Accept Bakong KHQR payments with live status sync
          </p>
        </div>

        {/* Selected Plan Summary */}
        <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              Selected Item
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Crown className="w-4 h-4 text-amber-400" />
              {plan.name}
            </h3>
            <p className="text-[11px] text-gray-400">Unlimited VIP Streaming Pass</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-white">${plan.price.toFixed(2)}</span>
            <span className="text-xs text-gray-400 block">{plan.period}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-xs text-red-300 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>CutLuy API Error</span>
            </div>
            <p className="leading-relaxed">{errorMessage}</p>
            <p className="text-[11px] text-gray-400 pt-1">
              Store Owner Note: Ensure your CutLuy API secret key (<code className="text-red-300 bg-black/40 px-1 py-0.5 rounded">ck_live_...</code>) is configured under <strong>Admin Portal → CutLuy API Settings</strong>.
            </p>
          </div>
        )}

        {/* Step 1: Create Order Button if not created yet */}
        {!currentOrder ? (
          <div className="space-y-4">
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 text-xs text-gray-300 space-y-2">
              <div className="flex items-center justify-between font-bold text-gray-200">
                <span>Gateway Status</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> CutLuy REST API Ready
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {isAdmin
                  ? (config.apiKey ? `Admin Mode: Local backup key configured (${config.apiKey.slice(0, 8)}...)` : "Centralized server key is active.")
                  : "Secure KHQR payment gateway is active and fully configured."}
              </p>
            </div>

            <button
              onClick={handleInitiateOrder}
              disabled={isCreating}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating CutLuy KHQR Payment...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>Generate KHQR Payment (${plan.price.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Step 2: Payment Created & QR Code / Redirect Link */
          <div className="space-y-4">
            {paymentDone ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-2 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Payment Completed Successfully!</h3>
                <p className="text-xs text-gray-300">Your VIP access and coins have been activated.</p>
              </div>
            ) : (
              <>
                {/* QR Code & Direct Cutluy URL */}
                <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Scan KHQR Code with Bakong or Mobile Banking App</span>
                  </div>

                  <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-md">
                    <img
                      src={currentOrder.qrCodeUrl}
                      alt="CutLuy KHQR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Cutluy Checkout Short URL */}
                  <div className="flex items-center gap-2 bg-[#121212] p-2.5 rounded-xl border border-white/10 text-xs font-mono text-gray-300">
                    <span className="truncate flex-1 text-left text-[11px] text-emerald-400 font-semibold">
                      {currentOrder.checkoutUrl}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                      title="Copy CutLuy Link"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={currentOrder.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open CutLuy Page</span>
                    </a>

                    <button
                      onClick={handleConfirmPayment}
                      disabled={isVerifying}
                      className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Check Status</span>
                    </button>
                  </div>

                  {/* Testing Bypass Option */}
                  {isAdmin && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={handleForceActivate}
                        className="text-[11px] text-gray-500 hover:text-emerald-400 underline cursor-pointer transition-colors"
                      >
                        Testing / Demo: Force Confirm & Activate VIP
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Security badge footer */}
        <div className="pt-2 text-center text-[10px] text-gray-500 flex items-center justify-center gap-1.5 border-t border-white/5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>CutLuy Gateway (cutluy.com) • Instant VIP Activation</span>
        </div>
      </div>
    </div>
  );
};
