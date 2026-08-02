import React, { useState } from "react";
import { X, Crown, Check, Sparkles, ShieldCheck, CreditCard, Clock, Percent } from "lucide-react";
import { SubscriptionPlan, UserProfile } from "../types";

interface UpgradeModalProps {
  onClose: () => void;
  onUpgradeSuccess: () => void;
  onOpenCutluyCheckout: (plan: SubscriptionPlan) => void;
  user?: UserProfile | null;
}

const BASE_PLANS: Record<"weekly" | "monthly" | "yearly", SubscriptionPlan> = {
  weekly: {
    id: "plan_weekly",
    name: "Weekly VIP Access",
    price: 2.99,
    coins: 50,
    period: "/ week",
    features: ["Unlock All VIP Episodes", "HD 1080p Quality", "Ad-Free Stream"]
  },
  monthly: {
    id: "plan_monthly",
    name: "Monthly VIP Pass",
    price: 8.99,
    coins: 250,
    period: "/ month",
    popular: true,
    features: ["Unlock All VIP Episodes", "1080p Ultra HD Quality", "Ad-Free Playback", "250 Bonus Coins"]
  },
  yearly: {
    id: "plan_yearly",
    name: "Annual Unlimited VIP",
    price: 59.99,
    coins: 2000,
    period: "/ year",
    features: ["Save 60% Annual Discount", "All 50,000+ Episodes", "2000 Bonus Coins", "Priority Video CDN"]
  }
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  onClose,
  onUpgradeSuccess,
  onOpenCutluyCheckout,
  user
}) => {
  const [selectedPlanKey, setSelectedPlanKey] = useState<"weekly" | "monthly" | "yearly">("monthly");

  // Check if user currently has an active VIP subscription that hasn't expired
  const isCurrentlyVip = Boolean(
    user?.isVip && user?.vipExpiresAt && new Date(user.vipExpiresAt) > new Date()
  );

  // Early renewal discount multiplier: 20% OFF if renewing before expiration or within active VIP period
  const getPlanWithDiscount = (key: "weekly" | "monthly" | "yearly"): SubscriptionPlan => {
    const base = BASE_PLANS[key];
    if (isCurrentlyVip) {
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

  const handleCheckout = () => {
    const planToBuy = getPlanWithDiscount(selectedPlanKey);
    onClose();
    onOpenCutluyCheckout(planToBuy);
  };

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
          {/* Early Renewal Discount Banner */}
          {isCurrentlyVip && (
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
              <span>Cutluy Instant Checkout</span>
            </div>
          </div>

          {/* Plans Selection */}
          <div className="space-y-3">
            {/* Weekly */}
            {(() => {
              const base = BASE_PLANS.weekly;
              const current = getPlanWithDiscount("weekly");
              return (
                <button
                  onClick={() => setSelectedPlanKey("weekly")}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    selectedPlanKey === "weekly"
                      ? "bg-red-600/20 border-red-500 text-white shadow-md"
                      : "bg-[#181818] border-white/5 text-gray-400 hover:border-white/20"
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Weekly Access</span>
                      {isCurrentlyVip && (
                        <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                          20% OFF
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400">Billed weekly. Extend anytime.</p>
                  </div>
                  <div className="text-right">
                    {isCurrentlyVip ? (
                      <div>
                        <p className="font-bold text-base text-emerald-400">${current.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 line-through">${base.price.toFixed(2)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-base text-white">${base.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">/ week</p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })()}

            {/* Monthly */}
            {(() => {
              const base = BASE_PLANS.monthly;
              const current = getPlanWithDiscount("monthly");
              return (
                <button
                  onClick={() => setSelectedPlanKey("monthly")}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all relative cursor-pointer ${
                    selectedPlanKey === "monthly"
                      ? "bg-red-600/20 border-red-500 text-white shadow-md"
                      : "bg-[#181818] border-white/5 text-gray-400 hover:border-white/20"
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                    {isCurrentlyVip ? "20% Renewal Discount" : "Most Popular"}
                  </span>
                  <div>
                    <p className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Monthly VIP Subscription</span>
                      {isCurrentlyVip && (
                        <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                          20% OFF
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-amber-400 font-medium">Unlimited Access to All Episodes</p>
                  </div>
                  <div className="text-right">
                    {isCurrentlyVip ? (
                      <div>
                        <p className="font-bold text-base text-emerald-400">${current.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 line-through">${base.price.toFixed(2)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-base text-white">${base.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">/ month</p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })()}

            {/* Yearly */}
            {(() => {
              const base = BASE_PLANS.yearly;
              const current = getPlanWithDiscount("yearly");
              return (
                <button
                  onClick={() => setSelectedPlanKey("yearly")}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    selectedPlanKey === "yearly"
                      ? "bg-red-600/20 border-red-500 text-white shadow-md"
                      : "bg-[#181818] border-white/5 text-gray-400 hover:border-white/20"
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Yearly VIP (Save 60%)</span>
                      {isCurrentlyVip && (
                        <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                          20% OFF
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-amber-400 font-medium">Full Year Unlimited VIP Access</p>
                  </div>
                  <div className="text-right">
                    {isCurrentlyVip ? (
                      <div>
                        <p className="font-bold text-base text-emerald-400">${current.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 line-through">${base.price.toFixed(2)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-base text-white">${base.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">/ year</p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })()}
          </div>

          <button
            onClick={handleCheckout}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white py-3.5 rounded-2xl font-bold text-xs shadow-xl shadow-emerald-900/40 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              Pay with Cutluy Gateway ({getPlanWithDiscount(selectedPlanKey).name} - ${getPlanWithDiscount(selectedPlanKey).price.toFixed(2)})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

