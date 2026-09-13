import React, { useState } from "react";
import { X, Crown, Check, ShieldCheck, CreditCard, Clock, Percent, Zap, Ticket, Loader2, Sparkles } from "lucide-react";
import { PromoDiscount, SubscriptionPlan, UserProfile, PaymentGatewayType } from "../types";
import { getPaymentGatewaySettings } from "../services/gatewayService";
import { checkPromoCode, computePlanDiscount, normalizePromoCode, redeemPromoCode } from "../services/promoService";

interface UpgradeModalProps {
  onClose: () => void;
  onUpgradeSuccess: () => void;
  onOpenCutluyCheckout: (plan: SubscriptionPlan, promo: PromoDiscount | null, gateway?: PaymentGatewayType, mode?: "bakong" | "aba") => void;
  onFreeGrant: (promo: PromoDiscount) => void;
  user?: UserProfile | null;
}

export const BASE_PLANS: Record<"weekly" | "monthly" | "yearly", SubscriptionPlan> = {
  weekly: {
    id: "plan_weekly",
    name: "Weekly VIP Access",
    price: 1.99,
    coins: 50,
    period: "/ week",
    features: ["Unlock All VIP Episodes", "HD 1080p Quality", "Ad-Free Stream"]
  },
  monthly: {
    id: "plan_monthly",
    name: "Monthly VIP Pass",
    price: 5.99,
    coins: 250,
    period: "/ month",
    popular: true,
    features: ["Unlock All VIP Episodes", "1080p Ultra HD Quality", "Ad-Free Playback", "250 Bonus Coins"]
  },
  yearly: {
    id: "plan_yearly",
    name: "Annual Unlimited VIP",
    price: 49.99,
    coins: 2000,
    period: "/ year",
    features: ["Best Value — 2 Months Free", "All 50,000+ Episodes", "2000 Bonus Coins", "Priority Video CDN"]
  }
};

type PlanKey = "weekly" | "monthly" | "yearly";

const PLAN_ROWS: { key: PlanKey; label: string; sub: string }[] = [
  { key: "weekly", label: "Weekly Access", sub: "Billed weekly. Extend anytime." },
  { key: "monthly", label: "Monthly VIP Subscription", sub: "Unlimited Access to All Episodes" },
  { key: "yearly", label: "Yearly VIP (Best Value)", sub: "Full Year Unlimited VIP Access" },
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  onClose,
  onUpgradeSuccess,
  onOpenCutluyCheckout,
  onFreeGrant,
  user
}) => {
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>("monthly");

  // Promo code state
  const [codeInput, setCodeInput] = useState<string>("");
  const [promo, setPromo] = useState<PromoDiscount | null>(null);
  const [promoNotice, setPromoNotice] = useState<string>("");
  const [promoType, setPromoType] = useState<"checking" | "idle">("idle");

  const savedSettings = getPaymentGatewaySettings();
  const activeGateway = savedSettings.activeGateway === "senghongstore" ? "senghongstore" : "cutluy";
  const activeMode = savedSettings.senghong.mode || "bakong";

  // Check if user currently has an active VIP subscription that hasn't expired
  const isCurrentlyVip = Boolean(
    user?.isVip && user?.vipExpiresAt && new Date(user.vipExpiresAt) > new Date()
  );

  // Renewal discount only when NO promo code is applied (promo wins, no stacking)
  const getPlanWithDiscount = (key: PlanKey): SubscriptionPlan => {
    const base = BASE_PLANS[key];
    if (!promo && isCurrentlyVip) {
      const discountedPrice = Number((base.price * 0.8).toFixed(2));
      return {
        ...base,
        originalPrice: base.price,
        discountApplied: 20,
        price: discountedPrice,
      };
    }
    return base;
  };

  // The plan actually shown/charged, with the promo applied on top
  const displayPlan = (key: PlanKey): { plan: SubscriptionPlan; promoAmount: number } => {
    const base = getPlanWithDiscount(key);
    if (!promo || promo.freeDays !== null) return { plan: base, promoAmount: 0 };
    const after = computePlanDiscount(promo.promo, base).finalPrice;
    return { plan: { ...base, originalPrice: base.price, price: after, promoCode: promo.code, promoLabel: promo.label }, promoAmount: Number((base.price - after).toFixed(2)) };
  };

  const handleApplyPromo = async () => {
    if (promoType === "checking") return;
    const key = normalizePromoCode(codeInput);
    if (!key) {
      setPromoNotice("Enter a promo code first.");
      return;
    }
    setPromoType("checking");
    setPromoNotice("");
    try {
      // Validate through the server relay (promo docs are admin-only in
      // Firestore; the relay returns the live doc without consuming it).
      const result = await checkPromoCode(key, user?.email || "");
      if (!result) {
        setPromoNotice("❌ Invalid promo code. Please check and try again.");
        return;
      }
      if ("error" in result) {
        setPromoNotice(`❌ ${result.error}`);
        return;
      }
      const base = getPlanWithDiscount(selectedPlanKey);
      const applied = computePlanDiscount(result.promo, base);
      setPromo(applied);
      setCodeInput(key);
      setPromoNotice(`✅ ${applied.label} applied!`);
    } catch (err: any) {
      console.error("Promo apply failed:", err);
      setPromoNotice("❌ Could not verify the code. Try again.");
    } finally {
      setPromoType("idle");
    }
  };

  const handleRemovePromo = () => {
    setPromo(null);
    setCodeInput("");
    setPromoNotice("");
  };

  const handleCheckout = async () => {
    // FREE VIP code path: instant grant, no payment at all.
    if (promo && promo.freeDays !== null) {
      try {
        await redeemPromoCode(promo.code, user?.email || "");
      } catch (err: any) {
        setPromoNotice(`❌ ${err?.message || "This code could not be redeemed."}`);
        return;
      }
      onFreeGrant(promo);
      onClose();
      return;
    }

    const { plan } = displayPlan(selectedPlanKey);
    const planToBuy: SubscriptionPlan = promo
      ? { ...plan, promoCode: promo.code, promoLabel: promo.label }
      : plan;

    // Discounted (non-free) path: the code is NOT consumed here — that would
    // burn it if the buyer abandons the payment. App.handlePaymentSuccess
    // redeems it (server-validated) once the gateway confirms PAID.
    onClose();
    onOpenCutluyCheckout(planToBuy, promo, activeGateway, activeMode);
  };

  const current = displayPlan(selectedPlanKey);
  const payAmount = current.plan.price;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="p-6 bg-gradient-to-br from-red-900 via-red-950 to-[#121212] border-b border-white/10 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20 text-black">
            <Crown className="w-7 h-7 fill-black" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">DRAMAHUB VIP PASS</h2>
          <p className="text-xs text-red-200/80 mt-1">Unlock all 50,000+ short drama episodes with no ads</p>

          {/* Active VIP Badge */}
          {isCurrentlyVip && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Active: {user?.vipPlanName || "VIP Pass"} (Expires {user?.vipExpiresAt ? new Date(user.vipExpiresAt).toLocaleDateString() : "Active"})
              </span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Early Renewal Discount Banner (hidden while a promo code is applied) */}
          {isCurrentlyVip && !promo && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2 font-black text-amber-300">
                <Percent className="w-4 h-4 text-emerald-400" />
                <span>20% Early Renewal Discount Applied!</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Because you are renewing before your current VIP pass expires, enjoy <strong>20% OFF</strong> all plan options. Your new duration will be seamlessly added to your existing expiration date!
              </p>
            </div>
          )}

          {/* Features List */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-500 shrink-0" />
              <span>Unlock All VIP Episodes</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-500 shrink-0" />
              <span>1080p Ultra HD Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-500 shrink-0" />
              <span>Ad-Free Continuous Playback</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-500 shrink-0" />
              <span>Instant KHQR Activation</span>
            </div>
          </div>

          {/* Plans Selection */}
          <div className="space-y-3">
            {PLAN_ROWS.map(({ key, label, sub }) => {
              const base = BASE_PLANS[key];
              const { plan, promoAmount } = displayPlan(key);
              const showStrike = Boolean(plan.originalPrice && plan.originalPrice > plan.price);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlanKey(key)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all relative cursor-pointer ${
                    selectedPlanKey === key
                      ? "bg-red-600/20 border-red-500 text-white shadow-md"
                      : "bg-[#181818] border-white/5 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {key === "monthly" && (
                    <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                      {!promo && isCurrentlyVip ? "20% Renewal Discount" : "Most Popular"}
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                      <span>{label}</span>
                      {showStrike && !promo && (
                        <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                          20% OFF
                        </span>
                      )}
                      {promoAmount > 0 && (
                        <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded-md font-bold">
                          PROMO {promo?.label}
                        </span>
                      )}
                      {promo && promo.freeDays !== null && selectedPlanKey === key && (
                        <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                          {promo.label}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400">{sub}</p>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    {showStrike ? (
                      <div>
                        <p className={`font-bold text-base ${promoAmount > 0 ? "text-amber-300" : "text-emerald-400"}`}>${plan.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 line-through">${plan.originalPrice?.toFixed(2)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-base text-white">${base.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{base.period}</p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Promo Code Box */}
          <div className="space-y-2">
            {!promo ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Ticket className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") handleApplyPromo(); }}
                    placeholder="Promo code (e.g. VIPWELCOME)"
                    className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-3 py-3 text-xs font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500/60 tracking-widest uppercase"
                  />
                </div>
                <button
                  onClick={handleApplyPromo}
                  disabled={promoType === "checking"}
                  className="px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black hover:bg-amber-500/25 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {promoType === "checking" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Apply</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-300 truncate">
                      {promo.code} — {promo.label}
                      {promo.freeDays !== null && <span className="text-[10px] font-bold text-emerald-200"> (no payment needed)</span>}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {promo.freeDays !== null
                        ? `Instant ${promo.freeDays} free VIP days on Redeem`
                        : `Price drops to $${promo.finalPrice.toFixed(2)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                  title="Remove promo code"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {promoNotice && (
              <p className={`text-[11px] font-bold px-1 ${promoNotice.startsWith("✅") ? "text-emerald-400" : "text-red-400"}`}>
                {promoNotice}
              </p>
            )}
          </div>

          {/* Payment Method Notice (hidden for free codes) */}
          {!(promo && promo.freeDays !== null) && (
            <div className="p-3.5 bg-[#181818] border border-white/10 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Instant KHQR & Mobile Banking</p>
                  <p className="text-[10px] text-gray-400">Scan with Bakong, ABA Mobile, ACLEDA, or any Bank App</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Auto-Activation
              </span>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={promoType === "checking"}
            className={`w-full py-4 rounded-2xl font-black text-xs shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 ${
              promo && promo.freeDays !== null
                ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-amber-950/50 hover:from-amber-400 hover:to-yellow-300"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50"
            }`}
          >
            {promo && promo.freeDays !== null ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Claim FREE {promo.freeDays} Days VIP — $0.00</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>
                  {promo ? "Continue with Promo" : "Pay with KHQR"} • ${payAmount.toFixed(2)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
