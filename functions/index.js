const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

// Lazy init — runs with the Cloud Run default service account, which has
// Firestore admin access and bypasses security rules by design.
let db;
function getDb() {
  if (!db) {
    admin.initializeApp();
    db = admin.firestore();
    db.settings({ databaseId: "ai-studio-dramahub-19e8f629-73b9-40e9-bfc6-37a8badaab29" });
  }
  return db;
}

const CODE_RE = /^[A-Z0-9_-]{3,24}$/;

exports.redeemPromo = functions.region("asia-southeast1").https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    const body = req.body || {};
    const code = String(body.code || "").trim().toUpperCase();
    const userEmail = String(body.userEmail || "").trim().toLowerCase();

    if (!CODE_RE.test(code)) {
      return res.status(400).json({ ok: false, message: "Invalid promo code format." });
    }

    const firestore = getDb();
    const ref = firestore.collection("promoCodes").doc(code);

    // Transaction: all validation happens server-side against live data,
    // so clients cannot skip limits/expiry/one-per-user by racing.
    const result = await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { fail: [404, "Promo code not found."] };

      const p = snap.data();
      const now = Date.now();

      if (p.active === false) return { fail: [400, "This code has been deactivated."] };
      if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return { fail: [400, "This code has expired."] };

      const maxUses = Number(p.maxUses || 0);
      const usedCount = Number(p.usedCount || 0);
      if (maxUses > 0 && usedCount >= maxUses) return { fail: [400, "This code has reached its usage limit."] };

      const redeemedBy = Array.isArray(p.redeemedBy) ? p.redeemedBy : [];
      if (userEmail && redeemedBy.map((e) => String(e).toLowerCase()).includes(userEmail)) {
        return { fail: [400, "You have already used this code."] };
      }

      tx.update(ref, {
        usedCount: usedCount + 1,
        redeemedBy: userEmail ? [...redeemedBy, userEmail] : redeemedBy,
        updatedAt: new Date().toISOString(),
      });
      return { ok: { code, usedCount: usedCount + 1 } };
    });

    if (result.fail) return res.status(result.fail[0]).json({ ok: false, message: result.fail[1] });
    return res.json({ ok: true, ...result.ok });
  } catch (err) {
    console.error("redeemPromo error:", err);
    return res.status(500).json({ ok: false, message: err?.message || "Promo redemption failed." });
  }
});
