import express from "express";
import path from "path";
import crypto from "node:crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Google OAuth Configuration & Routes
const getGoogleOAuthConfig = (req: express.Request) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || "";
  const host = req.get("host") || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
};

app.get("/api/auth/google/config", (req, res) => {
  const { clientId, redirectUri } = getGoogleOAuthConfig(req);
  res.json({ configured: Boolean(clientId), clientId, redirectUri });
});

app.get("/api/auth/google/url", (req, res) => {
  const { clientId, redirectUri } = getGoogleOAuthConfig(req);
  if (!clientId) {
    return res.status(400).json({
      error: "missing_client_id",
      message: "GOOGLE_CLIENT_ID is not configured in server environment variables."
    });
  }
  const scope = encodeURIComponent("https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile");
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
  res.json({ url: authUrl, redirectUri, clientId });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error || !code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Sign-In Failed</title></head>
        <body style="font-family:sans-serif; background:#141414; color:#fff; text-align:center; padding:50px;">
          <h2 style="color:#ef4444;">Google Sign-In Cancelled or Failed</h2>
          <p>${error || "No authorization code received"}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${error || "cancelled"}' }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
      </html>
    `);
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(req);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange Google authorization code for token");
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userInfo = await userInfoRes.json();
    if (!userInfo || !userInfo.email) {
      throw new Error("Failed to fetch Google account profile");
    }

    const userPayload = JSON.stringify({
      id: `usr_gmail_${userInfo.id || Date.now()}`,
      name: userInfo.name || userInfo.email.split("@")[0],
      email: userInfo.email,
      avatarUrl: userInfo.picture || "https://lh3.googleusercontent.com/a/default-user=s96-c",
      authMethod: "gmail",
      verified: userInfo.verified_email ?? true
    });

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Sign-In Successful</title></head>
        <body style="font-family:sans-serif; background:#141414; color:#fff; text-align:center; padding:50px;">
          <h2 style="color:#22c55e;">Google Sign-In Successful!</h2>
          <p style="color:#aaa;">Welcome, <strong>${userInfo.name || userInfo.email}</strong></p>
          <p style="font-size:12px; color:#666;">Completing sign in...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: ${userPayload} }, '*');
              setTimeout(() => window.close(), 500);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Sign-In Error</title></head>
        <body style="font-family:sans-serif; background:#141414; color:#fff; text-align:center; padding:50px;">
          <h2 style="color:#ef4444;">Google Sign-In Error</h2>
          <p>${err.message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: ${JSON.stringify(err.message)} }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Proxy video or stream requests to bypass CORS restrictions
app.get("/api/proxy-stream", async (req, res) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const range = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": new URL(videoUrl).origin,
    };

    if (range) {
      fetchHeaders["Range"] = range;
    }

    const response = await fetch(videoUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
      return res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
    }

    // Forward status and essential headers
    res.status(response.status);
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

    // Stream body
    if (response.body) {
      const reader = response.body.getReader();
      const stream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (err) {
          console.error("Error streaming body:", err);
          res.end();
        }
      };
      stream();
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error("Proxy stream error:", error);
    res.status(500).json({ error: "Failed to proxy video stream", message: error.message });
  }
});

// Stream URL analyzer
app.get("/api/analyze-stream", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const headRes = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const contentType = headRes.headers.get("content-type") || "unknown";
    const size = headRes.headers.get("content-length") || "unknown";
    const isM3U8 = url.includes(".m3u8") || contentType.includes("mpegurl");

    res.json({
      url,
      status: headRes.status,
      contentType,
      contentLengthBytes: size,
      isHLS: isM3U8,
      proxiedUrl: `/api/proxy-stream?url=${encodeURIComponent(url)}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Could not inspect stream URL", details: err.message });
  }
});

// DramaBox / DramaFren URL Parser Endpoint
app.get("/api/parse-dramafren", async (req, res) => {
  const inputUrl = req.query.url as string;
  if (!inputUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const parsedUrl = new URL(inputUrl);
    const params = parsedUrl.searchParams;
    
    const dramaId = params.get("id") || "42000022821";
    const ep = params.get("ep") || "1";
    const slug = params.get("slug") || "they-bought-houses-i-built-a-fortune";
    const lang = params.get("lang") || "en";
    
    // Format human-readable title from slug
    const formattedTitle = slug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    res.json({
      success: true,
      originalUrl: inputUrl,
      dramaId,
      episode: parseInt(ep, 10),
      slug,
      title: formattedTitle,
      language: lang,
      serverCredit: "Stream Server & Open Source Media Credit: DramaBox / DramaFren Project (dramabox.dramafren.org)",
      sourceDomain: parsedUrl.hostname,
    });
  } catch (err: any) {
    res.status(400).json({ error: "Invalid DramaBox/DramaFren URL format", details: err.message });
  }
});

// CutLuy Official REST API Endpoints
// Create KHQR Payment on cutluy.com/v1/payments
app.post("/api/cutluy/create-payment", async (req, res) => {
  const { amount, reference_id, apiKey } = req.body;

  if (!amount || Number(amount) < 0.01) {
    return res.status(400).json({ error: "amount_too_low", message: "Minimum amount is 0.01" });
  }

  const effectiveKey = (apiKey && typeof apiKey === "string" && apiKey.trim().length > 3)
    ? apiKey.trim()
    : process.env.CUTLUY_API_KEY || "";

  if (!effectiveKey) {
    return res.status(401).json({
      error: "unauthorized",
      message: "CutLuy Secret API key is required. Please set your API key in Admin Portal -> CutLuy API Settings."
    });
  }

  try {
    const cutluyRes = await fetch("https://cutluy.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${effectiveKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Number(amount),
        reference_id: reference_id || `order_${Date.now()}`
      })
    });

    const data = await cutluyRes.json();

    if (!cutluyRes.ok) {
      return res.status(cutluyRes.status).json({
        error: data.error || "payment_error",
        message: data.message || "CutLuy payment creation failed"
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error("CutLuy Payment API Proxy error:", err);
    return res.status(502).json({
      error: "payment_provider_error",
      message: err.message || "Failed to reach CutLuy servers"
    });
  }
});

// Memory store for CutLuy webhook events to synchronize payment completion instantly
const cutluyWebhookEvents = new Map<string, { status: string; receivedAt: string }>();

// Retrieve/Check Payment Status on cutluy.com/v1/payments/:id
app.get("/api/cutluy/check-payment/:id", async (req, res) => {
  const paymentId = req.params.id;
  const apiKey = (req.query.apiKey as string) || process.env.CUTLUY_API_KEY || "";

  // Check if webhook already delivered a paid event for this payment ID
  if (cutluyWebhookEvents.has(paymentId)) {
    const cached = cutluyWebhookEvents.get(paymentId);
    return res.json({ status: cached?.status || "paid", source: "webhook" });
  }

  if (!apiKey) {
    return res.status(401).json({ error: "unauthorized", message: "Missing CutLuy API Key" });
  }

  try {
    const cutluyRes = await fetch(`https://cutluy.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`
      }
    });

    const data = await cutluyRes.json();
    if (data?.status === "paid") {
      cutluyWebhookEvents.set(paymentId, { status: "paid", receivedAt: new Date().toISOString() });
    }
    return res.status(cutluyRes.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: "failed_to_check", message: err.message });
  }
});

// CutLuy Webhook Event Receiver
app.post(["/webhooks/cutluy", "/api/webhooks/cutluy"], (req, res) => {
  const signature = req.get("X-CutLuy-Signature") || "";
  const event = req.body;

  console.log("Received CutLuy Webhook Event:", event?.type, "Payment ID:", event?.data?.payment?.id);

  const webhookSecret = process.env.CUTLUY_WEBHOOK_SECRET;
  if (webhookSecret && signature) {
    try {
      const parts = Object.fromEntries(signature.split(",").map((p: string) => p.split("=")));
      const rawBody = JSON.stringify(req.body);
      const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(`${parts.t}.${rawBody}`)
        .digest("hex");

      const valid = parts.v1 && parts.v1 === expected;
      if (!valid) {
        console.warn("CutLuy Webhook signature verification failed");
        return res.status(400).send("invalid signature");
      }
    } catch (err) {
      console.error("CutLuy Webhook signature check error:", err);
    }
  }

  // Record payment completion from webhook payload
  const payId = event?.data?.payment?.id || event?.data?.id || event?.payment_id;
  const eventType = event?.type || "";
  const status = event?.data?.payment?.status || (eventType.includes("paid") ? "paid" : "pending");

  if (payId && (status === "paid" || eventType.includes("paid"))) {
    cutluyWebhookEvents.set(payId, { status: "paid", receivedAt: new Date().toISOString() });
    console.log(`Updated CutLuy Payment ${payId} to paid from webhook.`);
  }

  return res.status(200).json({ received: true, type: event?.type || "ok" });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DramaHub Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
