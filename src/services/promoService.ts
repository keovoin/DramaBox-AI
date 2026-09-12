// Promo code engine: codes live in Firestore (collection "promoCodes"), created
// by the admin panel. Regular users get public read; redemption writes go
// through the server relay (/api/promo/redeem) because security rules deny
// client-side writes to promo docs for non-admins.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PromoCode, PromoDiscount, SubscriptionPlan } from "../types";

const PROMO_COLLECTION = "promoCodes";

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** A code is redeemable right now? Returns a human-readable reason when not. */
export function promoUsability(
  promo: PromoCode,
  userEmail?: string | null
): { ok: boolean; reason?: string } {
  const now = Date.now();
  if (promo.active === false) return { ok: false, reason: "This code has been deactivated." };
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < now)
    return { ok: false, reason: "This code has expired." };
  if ((promo.maxUses ?? 0) > 0 && (promo.usedCount ?? 0) >= promo.maxUses!)
    return { ok: false, reason: "This code has reached its usage limit." };
  const email = (userEmail || "").toLowerCase();
  if (email && promo.redeemedBy?.includes(email))
    return { ok: false, reason: "You have already used this code." };
  return { ok: true };
}

/** Compute the discount for a plan WITHOUT consuming the code. */
export function computePlanDiscount(
  promo: PromoCode,
  plan: SubscriptionPlan
): PromoDiscount {
  const originalPrice = plan.price;
  let finalPrice = originalPrice;
  let freeDays: number | null = null;
  let label = "";

  switch (promo.type) {
    case "percent": {
      const pct = Math.min(Math.max(Number(promo.value) || 0, 0), 100);
      finalPrice = Number((originalPrice * (1 - pct / 100)).toFixed(2));
      label = `${pct}% OFF`;
      break;
    }
    case "fixed": {
      const amt = Math.max(Number(promo.value) || 0, 0);
      finalPrice = Number(Math.max(originalPrice - amt, 0).toFixed(2));
      label = `$${amt.toFixed(2)} OFF`;
      break;
    }
    case "free_days": {
      // Free-VIP codes ignore the selected plan entirely (instant grant).
      finalPrice = 0;
      freeDays = Math.max(Number(promo.value) || 0, 0);
      label = `FREE ${freeDays} Days VIP`;
      break;
    }
  }

  return {
    promo,
    code: promo.code,
    originalPrice,
    finalPrice,
    discountAmount: Number((originalPrice - finalPrice).toFixed(2)),
    freeDays,
    label,
  };
}

export async function fetchPromoByCode(code: string): Promise<PromoCode | null> {
  const key = normalizePromoCode(code);
  if (!key) return null;
  try {
    const snap = await getDoc(doc(db, PROMO_COLLECTION, key));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<PromoCode, "id">) };
  } catch (err) {
    console.error("Failed to fetch promo code:", err);
    return null;
  }
}

/** Live list of all promo codes for the admin panel. */
export function subscribeToPromoCodes(onUpdate: (promos: PromoCode[]) => void): () => void {
  return onSnapshot(
    collection(db, PROMO_COLLECTION),
    (snapshot) => {
      const items: PromoCode[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<PromoCode, "id">) });
      });
      items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      onUpdate(items);
    },
    (error) => {
      console.error("Firestore promoCodes subscription error:", error);
    }
  );
}

/** Admin create/update (upsert keyed by normalized code). Admin-only per rules. */
export async function savePromoCode(promo: PromoCode): Promise<void> {
  const key = normalizePromoCode(promo.code);
  const clean: Record<string, any> = {
    id: key,
    code: key,
    type: promo.type,
    value: Number(promo.value) || 0,
    description: promo.description || "",
    maxUses: promo.maxUses ?? 0,
    usedCount: promo.usedCount ?? 0,
    redeemedBy: promo.redeemedBy ?? [],
    expiresAt: promo.expiresAt ?? null,
    active: promo.active !== false,
    createdAt: promo.createdAt || new Date().toISOString(),
    createdBy: promo.createdBy || "",
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, PROMO_COLLECTION, key), clean);
}

/** Admin deactivate / reactivate toggle. */
export async function setPromoCodeActive(codeKey: string, active: boolean): Promise<void> {
  const snap = await getDoc(doc(db, PROMO_COLLECTION, codeKey));
  if (!snap.exists()) throw new Error("Promo code not found");
  await setDoc(doc(db, PROMO_COLLECTION, codeKey), { ...snap.data(), active, updatedAt: new Date().toISOString() });
}

/** Admin delete. */
export async function deletePromoCode(codeKey: string): Promise<void> {
  await deleteDoc(doc(db, PROMO_COLLECTION, codeKey));
}

/**
 * Consume a redemption (increments usedCount + records user email).
 * Production: Firebase Cloud Function `redeemPromo` (urdrama.com is
 * Firebase-Hosting-only, so there is no Express server there). The function
 * runs with admin privileges and re-validates every rule server-side inside a
 * Firestore transaction. Local dev: the mirrored Express route on :3000.
 */
const PROMO_FN_URL = "https://asia-southeast1-dramabox-ai.cloudfunctions.net/redeemPromo";

export async function redeemPromoCode(code: string, userEmail: string): Promise<void> {
  const key = normalizePromoCode(code);
  const payload = JSON.stringify({ code: key, userEmail: userEmail || "" });

  // 1) Cloud Function (production)
  try {
    const res = await fetch(PROMO_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok === true) return;
    // A definitive business rejection (expired/used/limit/not found) — surface it.
    if (res.status === 400 || res.status === 404) {
      throw new Error(data.message || "Promo code redemption failed");
    }
    throw new Error(data.message || "Promo redemption failed");
  } catch (fnErr: any) {
    // 2) Local dev fallback (Express mirror) when the function is unreachable.
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || data.error || "Promo code redemption failed");
      }
      return;
    }
    throw fnErr instanceof Error ? fnErr : new Error("Promo redemption failed");
  }
}
