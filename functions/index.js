const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

// Lazy init — runs with the Cloud Function service identity, which has
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

function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * Who is redeeming? If the client attached its Firebase ID token (logged-in
 * user), we trust the email INSIDE the token — a caller cannot attribute a
 * redemption to someone else. Anonymous callers fall back to the body email
 * (guest checkout) or empty.
 */
async function resolveEmail(req, body) {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.slice(7).trim());
      if (decoded.email) return { email: String(decoded.email).toLowerCase(), verified: true };
    } catch (err) {
      // Invalid/expired token — treat as anonymous rather than hard-fail.
    }
  }
  return { email: String(body.userEmail || "").trim().toLowerCase(), verified: false };
}

/** Minimal promo shape the client needs to render a discount (never the raw doc). */
function promoView(p) {
  return {
    code: p.code,
    type: p.type,
    value: Number(p.value || 0),
    description: p.description || "",
    maxUses: Number(p.maxUses || 0),
    usedCount: Number(p.usedCount || 0),
    redeemedBy: Array.isArray(p.redeemedBy) ? p.redeemedBy : [],
    expiresAt: p.expiresAt ?? null,
    active: p.active !== false,
    createdAt: p.createdAt || "",
  };
}

/** Shared usability evaluation against LIVE data (never the client copy). */
function usabilityFail(p, email) {
  const now = Date.now();
  if (p.active === false) return [400, "This code has been deactivated."];
  if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return [400, "This code has expired."];
  const maxUses = Number(p.maxUses || 0);
  const usedCount = Number(p.usedCount || 0);
  if (maxUses > 0 && usedCount >= maxUses) return [400, "This code has reached its usage limit."];
  const redeemedBy = Array.isArray(p.redeemedBy) ? p.redeemedBy : [];
  if (email && redeemedBy.map((e) => String(e).toLowerCase()).includes(email)) {
    return [400, "You have already used this code."];
  }
  return null;
}

/**
 * Promo relay for DramaHub. POST body: { action, code, userEmail? }
 *  - action "check":  validate without consuming; returns promo view + reason.
 *  - action "redeem": validate + consume atomically (transaction).
 * Same-origin clients (urdrama.com, localhost dev) call this directly.
 */
exports.redeemPromo = functions.region("asia-southeast1").https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    const body = req.body || {};
    const action = String(body.action || "redeem").toLowerCase();
    const code = String(body.code || "").trim().toUpperCase();
    const { email } = await resolveEmail(req, body);

    if (!CODE_RE.test(code)) {
      return res.status(400).json({ ok: false, message: "Invalid promo code format." });
    }

    const firestore = getDb();
    const ref = firestore.collection("promoCodes").doc(code);

    if (action === "check") {
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ ok: false, message: "Promo code not found." });
      const p = snap.data();
      const fail = usabilityFail(p, email);
      if (fail) return res.status(fail[0]).json({ ok: false, message: fail[1] });
      return res.json({ ok: true, promo: promoView(p) });
    }

    // Redeem: all validation happens server-side against live data inside a
    // transaction, so clients cannot skip limits/expiry/one-per-user by racing.
    const result = await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { fail: [404, "Promo code not found."] };

      const p = snap.data();
      const fail = usabilityFail(p, email);
      if (fail) return { fail };

      const usedCount = Number(p.usedCount || 0);
      const redeemedBy = Array.isArray(p.redeemedBy) ? p.redeemedBy : [];
      tx.update(ref, {
        usedCount: usedCount + 1,
        redeemedBy: email ? [...redeemedBy, email] : redeemedBy,
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
