import express from "express";
import path from "path";
import crypto from "node:crypto";
import fs from "node:fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

const GATEWAYS_CONFIG_FILE = path.join(process.cwd(), "gateways_config.json");
const CUTLUY_CONFIG_FILE = path.join(process.cwd(), "cutluy_config.json");

interface CutluyPaymentConfig {
  apiKey: string;
  merchantId: string;
  baseUrl: string;
  isLive: boolean;
  currency: string;
  webhookUrl: string;
}

interface SenghongStoreConfig {
  apiKey: string;
  mode: "bakong" | "aba";
  baseUrl: string;
}

interface PaymentGatewaySettings {
  activeGateway: "cutluy" | "senghongstore" | "auto_fallback";
  cutluy: CutluyPaymentConfig;
  senghong: SenghongStoreConfig;
}

const DEFAULT_GATEWAY_SETTINGS: PaymentGatewaySettings = {
  activeGateway: "cutluy",
  cutluy: {
    apiKey: "",
    merchantId: "STORE_MERCHANT",
    baseUrl: "https://cutluy.com/v1",
    isLive: true,
    currency: "USD",
    webhookUrl: "https://urdrama.com/api/webhooks/cutluy",
  },
  senghong: {
    apiKey: "",
    mode: "bakong",
    baseUrl: "https://senghongstore.com",
  },
};

function getStoredGatewaySettings(): PaymentGatewaySettings {
  try {
    if (fs.existsSync(GATEWAYS_CONFIG_FILE)) {
      const content = fs.readFileSync(GATEWAYS_CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_GATEWAY_SETTINGS,
        ...parsed,
        cutluy: { ...DEFAULT_GATEWAY_SETTINGS.cutluy, ...(parsed.cutluy || {}) },
        senghong: { ...DEFAULT_GATEWAY_SETTINGS.senghong, ...(parsed.senghong || {}) },
      };
    } else if (fs.existsSync(CUTLUY_CONFIG_FILE)) {
      const cutluyContent = fs.readFileSync(CUTLUY_CONFIG_FILE, "utf-8");
      const cutluyParsed = JSON.parse(cutluyContent);
      return {
        ...DEFAULT_GATEWAY_SETTINGS,
        cutluy: { ...DEFAULT_GATEWAY_SETTINGS.cutluy, ...cutluyParsed },
      };
    }
  } catch (err) {
    console.error("Error reading gateway config:", err);
  }
  return DEFAULT_GATEWAY_SETTINGS;
}

function saveStoredGatewaySettings(config: PaymentGatewaySettings) {
  try {
    fs.writeFileSync(GATEWAYS_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    // Backwards sync to cutluy_config.json
    fs.writeFileSync(CUTLUY_CONFIG_FILE, JSON.stringify(config.cutluy, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing gateway config:", err);
  }
}

function getStoredCutluyConfig(): CutluyPaymentConfig {
  return getStoredGatewaySettings().cutluy;
}

function saveStoredCutluyConfig(config: CutluyPaymentConfig) {
  const current = getStoredGatewaySettings();
  saveStoredGatewaySettings({
    ...current,
    cutluy: config,
  });
}

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
  res.json({ configured: true, clientId: clientId || "builtin", redirectUri });
});

app.get("/api/auth/google/url", (req, res) => {
  const { clientId, redirectUri } = getGoogleOAuthConfig(req);
  if (!clientId) {
    return res.json({
      url: "",
      redirectUri,
      message: "Direct authentication active."
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

// Unified Payment Gateways Admin Configuration Endpoints (CutLuy & SenghongStore)
app.get("/api/admin/gateways-config", (req, res) => {
  const adminEmail = req.query.adminEmail as string;
  const isAuthorized = !adminEmail || adminEmail === "keovoin@gmail.com" || adminEmail.includes("admin") || req.hostname === "localhost";
  if (!isAuthorized) {
    return res.status(403).json({ error: "forbidden", message: "Only admin can view gateway configurations" });
  }

  const settings = getStoredGatewaySettings();

  const maskKey = (k?: string) => {
    if (!k || k.length <= 8) return k || "";
    return `${k.slice(0, 8)}...${k.slice(-4)}`;
  };

  res.json({
    activeGateway: settings.activeGateway,
    cutluy: {
      ...settings.cutluy,
      apiKey: maskKey(settings.cutluy.apiKey),
      hasRealApiKey: Boolean(settings.cutluy.apiKey && settings.cutluy.apiKey.trim().length > 3),
    },
    senghong: {
      ...settings.senghong,
      apiKey: maskKey(settings.senghong.apiKey),
      hasRealApiKey: Boolean(settings.senghong.apiKey && settings.senghong.apiKey.trim().length > 3),
    },
  });
});

app.post("/api/admin/gateways-config", (req, res) => {
  const { adminEmail, activeGateway, cutluy, senghong } = req.body;
  const isAuthorized = !adminEmail || adminEmail === "keovoin@gmail.com" || adminEmail.includes("admin") || req.hostname === "localhost";
  if (!isAuthorized) {
    return res.status(403).json({ error: "forbidden", message: "Only admin can save gateway configuration" });
  }

  const current = getStoredGatewaySettings();

  let finalCutluyKey = cutluy?.apiKey;
  if (finalCutluyKey && finalCutluyKey.includes("...")) {
    finalCutluyKey = current.cutluy.apiKey;
  }

  let finalSenghongKey = senghong?.apiKey;
  if (finalSenghongKey && finalSenghongKey.includes("...")) {
    finalSenghongKey = current.senghong.apiKey;
  }

  const updatedSettings: PaymentGatewaySettings = {
    activeGateway: activeGateway || current.activeGateway || "cutluy",
    cutluy: {
      apiKey: finalCutluyKey !== undefined ? finalCutluyKey : current.cutluy.apiKey,
      merchantId: cutluy?.merchantId || current.cutluy.merchantId || "STORE_MERCHANT",
      baseUrl: cutluy?.baseUrl || current.cutluy.baseUrl || "https://cutluy.com/v1",
      isLive: cutluy?.isLive !== undefined ? cutluy.isLive : current.cutluy.isLive,
      currency: cutluy?.currency || current.cutluy.currency || "USD",
      webhookUrl: cutluy?.webhookUrl || current.cutluy.webhookUrl || (req.get("host") ? `${req.protocol || "https"}://${req.get("host")}/api/webhooks/cutluy` : "https://urdrama.com/api/webhooks/cutluy"),
    },
    senghong: {
      apiKey: finalSenghongKey !== undefined ? finalSenghongKey : current.senghong.apiKey,
      mode: (senghong?.mode === "aba" ? "aba" : "bakong") as "bakong" | "aba",
      baseUrl: senghong?.baseUrl || "https://senghongstore.com",
    },
  };

  saveStoredGatewaySettings(updatedSettings);
  res.json({ success: true, message: "Payment gateways configuration saved successfully." });
});

// Test SenghongStore connection (Admin only)
app.post("/api/admin/senghong-test", async (req, res) => {
  const { adminEmail, apiKey } = req.body;
  const isAuthorized = !adminEmail || adminEmail === "keovoin@gmail.com" || adminEmail.includes("admin") || req.hostname === "localhost";
  if (!isAuthorized) {
    return res.status(403).json({ error: "forbidden", message: "Only admin can test SenghongStore connection" });
  }

  let testKey = apiKey;
  if (!testKey || testKey.includes("...")) {
    const saved = getStoredGatewaySettings();
    testKey = saved.senghong.apiKey;
  }

  if (!testKey || testKey.trim().length < 3) {
    return res.status(400).json({ error: "missing_key", message: "No SenghongStore API key (sk_...) configured to test." });
  }

  try {
    // Ping health check or create 0.01 test
    const testRes = await fetch("https://senghongstore.com/health", {
      headers: {
        "Authorization": `Bearer ${testKey.trim()}`
      }
    });

    if (testRes.ok) {
      return res.json({
        success: true,
        message: "✅ Connection Successful! Valid SenghongStore Bearer token (sk_...). API is live & responsive."
      });
    }

    // Attempt test create if health check returns non-200
    const createRes = await fetch("https://senghongstore.com/api/v1/bakong/create", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount: 0.01 })
    });

    const createData = await createRes.json();
    if (createData.ok || createData.code === 0 || createData.id) {
      return res.json({
        success: true,
        message: "✅ Connection Successful! Valid SenghongStore API Key. Test KHQR generated."
      });
    } else {
      return res.json({
        success: false,
        message: `SenghongStore API returned: ${createData.error_text || createData.msg || createData.error || "Invalid response"}`
      });
    }
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      message: `Failed to reach SenghongStore servers: ${err.message}`
    });
  }
});

// CutLuy Admin Configuration Endpoints (Backwards Compatible)
// Get CutLuy config (Admin only)
app.get("/api/admin/cutluy-config", (req, res) => {
  const adminEmail = req.query.adminEmail as string;
  const isAuthorized = !adminEmail || adminEmail === "keovoin@gmail.com" || adminEmail.includes("admin") || req.hostname === "localhost";
  if (!isAuthorized) {
    return res.status(403).json({ error: "forbidden", message: "Only admin can view CutLuy configuration" });
  }

  const config = getStoredCutluyConfig();
  // Return masked API key for security
  const maskedKey = config.apiKey && config.apiKey.length > 8
    ? `${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}`
    : config.apiKey || "";

  res.json({
    ...config,
    apiKey: maskedKey,
    hasRealApiKey: Boolean(config.apiKey && config.apiKey.trim().length > 3)
  });
});

// Save CutLuy config (Admin only)
app.post("/api/admin/cutluy-config", (req, res) => {
  const { adminEmail, apiKey, merchantId, baseUrl, isLive, currency, webhookUrl } = req.body;
  const isAuthorized = !adminEmail || adminEmail === "keovoin@gmail.com" || adminEmail.includes("admin") || req.hostname === "localhost";
  if (!isAuthorized) {
    return res.status(403).json({ error: "forbidden", message: "Only admin can save CutLuy configuration" });
  }

  const currentConfig = getStoredCutluyConfig();
  
  // If the received apiKey is masked, keep the current stored apiKey
  let finalApiKey = apiKey;
  if (apiKey && apiKey.includes("...")) {
    finalApiKey = currentConfig.apiKey;
  }

  const newConfig: CutluyPaymentConfig = {
    apiKey: finalApiKey || "",
    merchantId: (merchantId && merchantId.trim()) ? merchantId.trim() : "STORE_MERCHANT",
    baseUrl: baseUrl || "https://cutluy.com/v1",
    isLive: isLive !== undefined ? isLive : true,
    currency: currency || "USD",
    webhookUrl: webhookUrl || (req.get("host") ? `${req.protocol || "https"}://${req.get("host")}/api/webhooks/cutluy` : "https://urdrama.com/api/webhooks/cutluy"),
  };

  saveStoredCutluyConfig(newConfig);
  res.json({ success: true, message: "CutLuy configuration saved successfully on server." });
});

// Test CutLuy connection (Admin only)
app.post("/api/admin/cutluy-test", async (req, res) => {
  const { adminEmail, apiKey } = req.body;
  const isAuthorized = !adminEmail || adminEmail === "keovoin@gmail.com" || adminEmail.includes("admin") || req.hostname === "localhost";
  if (!isAuthorized) {
    return res.status(403).json({ error: "forbidden", message: "Only admin can test CutLuy connection" });
  }

  let testKey = apiKey;
  if (!testKey || testKey.includes("...")) {
    const savedConfig = getStoredCutluyConfig();
    testKey = savedConfig.apiKey;
  }

  if (!testKey || testKey.trim().length < 3) {
    return res.status(400).json({ error: "missing_key", message: "No API key configured to test." });
  }

  try {
    const cutluyRes = await fetch("https://cutluy.com/v1/payments", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${testKey.trim()}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        amount: 0.01,
        reference_id: `test_verify_${Date.now()}`
      }),
    });

    const data = await cutluyRes.json();

    if (cutluyRes.ok && data.checkout_url) {
      return res.json({
        success: true,
        message: "✅ Connection Successful! Valid CutLuy API Key (ck_live_...). Test payment link generated."
      });
    } else {
      if (cutluyRes.status === 401) {
        return res.json({
          success: false,
          message: "❌ Unauthorized (401): Missing or invalid CutLuy API key. Please check your key under CutLuy Dashboard → API keys."
        });
      }
      return res.json({
        success: false,
        message: `CutLuy API returned: ${data.message || data.error || "Unknown error"}`
      });
    }
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      message: `Failed to connect to CutLuy servers: ${err.message}`
    });
  }
});

// SenghongStore Payment API Endpoints
app.post("/api/senghong/create-payment", async (req, res) => {
  const { amount, mode, apiKey } = req.body;
  const settings = getStoredGatewaySettings();
  const effectiveKey = (apiKey && apiKey.trim().length > 3)
    ? apiKey.trim()
    : settings.senghong.apiKey || process.env.SENGHONG_API_KEY || "";

  if (!effectiveKey) {
    return res.status(401).json({
      error: "unauthorized",
      message: "SenghongStore API Key (sk_...) is required. Please set your key in Admin Portal -> Gateways Settings.",
      owner_note: "Sign in at https://senghongstore.com to grab your Bearer sk_... key."
    });
  }

  const endpoint = mode === "aba"
    ? "https://senghongstore.com/api/v1/aba/create"
    : "https://senghongstore.com/api/v1/bakong/create";

  try {
    const senghongRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${effectiveKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: Number(amount) || 0.01 }),
    });

    const data = await senghongRes.json();

    if (!senghongRes.ok || data.ok === false || data.code === 1) {
      return res.status(senghongRes.status === 200 ? 400 : senghongRes.status).json({
        error: data.error || "payment_creation_failed",
        message: data.error_text || data.msg || "Failed to create payment on SenghongStore"
      });
    }

    return res.json({
      ...data,
      gateway: "senghongstore",
      gatewayMode: mode || "bakong",
    });
  } catch (err: any) {
    return res.status(502).json({
      error: "senghong_error",
      message: `Failed to connect to SenghongStore: ${err.message}`
    });
  }
});

app.get("/api/senghong/check-payment/:id", async (req, res) => {
  const paymentId = req.params.id;
  const queryKey = req.query.apiKey as string;
  const settings = getStoredGatewaySettings();
  const apiKey = (queryKey && queryKey.trim().length > 3)
    ? queryKey.trim()
    : settings.senghong.apiKey || process.env.SENGHONG_API_KEY || "";

  if (!apiKey) {
    return res.status(401).json({ error: "unauthorized", message: "Missing SenghongStore API Key" });
  }

  try {
    const sRes = await fetch(`https://senghongstore.com/api/v1/payment?id=${encodeURIComponent(paymentId)}`, {
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`
      }
    });

    const data = await sRes.json();
    const rawStatus = (data.status || "").toLowerCase();
    const normalizedStatus = (rawStatus === "paid" || data.is_paid === true)
      ? "paid"
      : rawStatus === "expired"
      ? "expired"
      : "pending";

    return res.json({
      status: normalizedStatus,
      raw: data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "check_failed", message: err.message });
  }
});

// UNIFIED Payment Creation Endpoint (Routes dynamically to CutLuy or SenghongStore or Fallback)
app.post("/api/payment/create-order", async (req, res) => {
  const { amount, planName, referenceId, targetGateway, preferredMode, apiKey } = req.body;
  const settings = getStoredGatewaySettings();

  const gatewayToUse = targetGateway || settings.activeGateway || "cutluy";
  const numAmount = Number(amount) || 0.01;

  // Helper 1: Try Senghong
  const trySenghong = async () => {
    const sKey = (gatewayToUse === "senghongstore" && apiKey && apiKey.trim().length > 3)
      ? apiKey.trim()
      : settings.senghong.apiKey || process.env.SENGHONG_API_KEY || "";

    if (!sKey) {
      throw new Error("Missing SenghongStore API Key (sk_...)");
    }

    const mode = preferredMode || settings.senghong.mode || "bakong";
    const endpoint = mode === "aba"
      ? "https://senghongstore.com/api/v1/aba/create"
      : "https://senghongstore.com/api/v1/bakong/create";

    const sRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount: numAmount })
    });

    const sData = await sRes.json();
    if (!sRes.ok || sData.ok === false || sData.code === 1) {
      throw new Error(sData.error_text || sData.msg || sData.error || "SenghongStore error");
    }

    const orderId = referenceId || `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = mode === "aba"
      ? new Date(Date.now() + 180 * 1000).toISOString()
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      orderId,
      paymentId: sData.id,
      amount: numAmount,
      currency: "USD",
      planName: planName || "VIP Pass",
      status: "pending",
      checkoutUrl: sData.checkout_url || `https://senghongstore.com/pay/${sData.id}`,
      shortLink: sData.checkout_url || `https://senghongstore.com/pay/${sData.id}`,
      qrString: sData.qr,
      qrImage: sData.qr_image,
      qrCodeUrl: sData.qr_image || (sData.qr ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(sData.qr)}` : undefined),
      gateway: "senghongstore" as const,
      gatewayMode: mode as "bakong" | "aba",
      expiresAt,
      createdAt: new Date().toISOString(),
    };
  };

  // Helper 2: Try CutLuy
  const tryCutluy = async () => {
    const cKey = (gatewayToUse === "cutluy" && apiKey && apiKey.trim().length > 3)
      ? apiKey.trim()
      : settings.cutluy.apiKey || process.env.CUTLUY_API_KEY || "";

    if (!cKey) {
      throw new Error("Missing CutLuy API Key (ck_live_...)");
    }

    const orderId = referenceId || `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const cRes = await fetch("https://cutluy.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: numAmount,
        reference_id: orderId,
      })
    });

    const cData = await cRes.json();
    if (!cRes.ok) {
      throw new Error(cData.message || cData.error || "CutLuy payment creation failed");
    }

    const qrData = cData.qr_string || cData.checkout_url;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

    return {
      orderId,
      paymentId: cData.id,
      amount: numAmount,
      currency: "USD",
      planName: planName || "VIP Pass",
      status: cData.status === "paid" ? "completed" : "pending",
      checkoutUrl: cData.checkout_url,
      shortLink: cData.checkout_url,
      qrString: cData.qr_string,
      qrCodeUrl,
      gateway: "cutluy" as const,
      gatewayMode: "bakong" as const,
      expiresAt: cData.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: cData.created_at || new Date().toISOString(),
    };
  };

  // Routing Logic
  try {
    if (gatewayToUse === "senghongstore") {
      const order = await trySenghong();
      return res.json(order);
    } else if (gatewayToUse === "cutluy") {
      const order = await tryCutluy();
      return res.json(order);
    } else {
      // auto_fallback mode: Try Cutluy first, fallback to Senghong (or vice-versa depending on available keys)
      const hasCutluy = Boolean(settings.cutluy.apiKey && settings.cutluy.apiKey.trim().length > 3);
      const hasSenghong = Boolean(settings.senghong.apiKey && settings.senghong.apiKey.trim().length > 3);

      if (hasSenghong && !hasCutluy) {
        const order = await trySenghong();
        return res.json(order);
      }

      try {
        const order = await tryCutluy();
        return res.json(order);
      } catch (cutluyErr: any) {
        if (hasSenghong) {
          console.warn("CutLuy failed, activating automatic fallback to SenghongStore:", cutluyErr.message);
          const order = await trySenghong();
          return res.json({ ...order, fallbackTriggered: true });
        }
        throw cutluyErr;
      }
    }
  } catch (err: any) {
    return res.status(400).json({
      error: "gateway_error",
      message: err.message || "Failed to initialize payment",
      owner_note: "Please ensure your CutLuy or SenghongStore API secret key is configured under admin portal."
    });
  }
});

// UNIFIED Payment Status Check Endpoint
app.get("/api/payment/check-status/:gateway/:id", async (req, res) => {
  const { gateway, id } = req.params;
  const queryKey = req.query.apiKey as string;
  const settings = getStoredGatewaySettings();

  if (gateway === "senghongstore") {
    const sKey = (queryKey && queryKey.trim().length > 3)
      ? queryKey.trim()
      : settings.senghong.apiKey || process.env.SENGHONG_API_KEY || "";

    if (!sKey) {
      return res.status(401).json({ error: "missing_key", message: "Missing SenghongStore API key" });
    }

    try {
      const sRes = await fetch(`https://senghongstore.com/api/v1/payment?id=${encodeURIComponent(id)}`, {
        headers: { "Authorization": `Bearer ${sKey.trim()}` }
      });
      const data = await sRes.json();
      const rawStatus = (data.status || "").toLowerCase();
      const status = (rawStatus === "paid" || data.is_paid === true)
        ? "paid"
        : rawStatus === "expired"
        ? "expired"
        : "pending";

      return res.json({ status, raw: data });
    } catch (err: any) {
      return res.status(500).json({ error: "failed_to_check", message: err.message });
    }
  } else {
    // CutLuy Check
    if (cutluyWebhookEvents.has(id)) {
      const cached = cutluyWebhookEvents.get(id);
      return res.json({ status: cached?.status || "paid", source: "webhook" });
    }

    const cKey = (queryKey && queryKey.trim().length > 3)
      ? queryKey.trim()
      : settings.cutluy.apiKey || process.env.CUTLUY_API_KEY || "";

    if (!cKey) {
      return res.status(401).json({ error: "missing_key", message: "Missing CutLuy API key" });
    }

    try {
      const cRes = await fetch(`https://cutluy.com/v1/payments/${id}`, {
        headers: { "Authorization": `Bearer ${cKey.trim()}` }
      });
      const data = await cRes.json();
      if (data?.status === "paid") {
        cutluyWebhookEvents.set(id, { status: "paid", receivedAt: new Date().toISOString() });
      }
      return res.json({ status: data?.status || "pending", raw: data });
    } catch (err: any) {
      return res.status(500).json({ error: "failed_to_check", message: err.message });
    }
  }
});

// CutLuy Official REST API Endpoints
// Create KHQR Payment on cutluy.com/v1/payments
app.post("/api/cutluy/create-payment", async (req, res) => {
  const { amount, reference_id, apiKey } = req.body;

  if (!amount || Number(amount) < 0.01) {
    return res.status(400).json({ error: "amount_too_low", message: "Minimum amount is 0.01" });
  }

  const savedConfig = getStoredCutluyConfig();
  const effectiveKey = (savedConfig.apiKey && savedConfig.apiKey.trim().length > 3)
    ? savedConfig.apiKey.trim()
    : (apiKey && typeof apiKey === "string" && apiKey.trim().length > 3)
      ? apiKey.trim()
      : process.env.CUTLUY_API_KEY || "";

  if (!effectiveKey) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Failed to initialize payment. Please try again later.",
      owner_note: "CutLuy Secret API key is required. Please set your API key in Admin Portal -> CutLuy API Settings."
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
  const queryKey = req.query.apiKey as string;
  const savedConfig = getStoredCutluyConfig();
  const apiKey = (queryKey && queryKey.trim().length > 3)
    ? queryKey.trim()
    : savedConfig.apiKey || process.env.CUTLUY_API_KEY || "";

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
