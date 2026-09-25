// api/proxe.js

const CONFIG = {
  BASE_URL: "https://vibrantacademykotaapi.akamai.net.in",

  // Vercel Environment Variables
  AUTH_KEY: process.env.AUTH_KEY || "appxapi",
  JWT_TOKEN: process.env.JWT_TOKEN || "",
  USER_ID: process.env.USER_ID || ""
};

const HEADERS = {
  "Accept": "application/json, text/plain, */*",
  "Auth-Key": CONFIG.AUTH_KEY,
  "Client-Service": "Appx",
  "User-Agent": "Mozilla/5.0",
  "User-ID": CONFIG.USER_ID,
  "is-safari": "0",
  "save-data": "on",
  "source": "website",
  "user_app_category": "3"
};

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // GET only
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  // Credentials check
  if (!CONFIG.JWT_TOKEN || !CONFIG.USER_ID) {
    return res.status(500).json({
      success: false,
      error: "Proxy credentials are not configured"
    });
  }

  try {
    const requestUrl = new URL(
      req.url || "/",
      `https://${req.headers.host || "localhost"}`
    );

    // Remove /api/proxe from the incoming URL
    let path = requestUrl.pathname.replace(/^\/api\/proxe/, "");

    if (!path || path === "/") {
      return res.status(200).json({
        status: "ok",
        message: "Proxy is running",
        example:
          "/api/proxe/get/course_contents_by_live_status?course_id=35&start=-1&live_status=1,2"
      });
    }

    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    const targetUrl =
      CONFIG.BASE_URL +
      path +
      requestUrl.search;

    const upstreamHeaders = {
      ...HEADERS,
      "Authorization": CONFIG.JWT_TOKEN
    };

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: upstreamHeaders
    });

    const body = await response.text();

    const contentType =
      response.headers.get("content-type") ||
      "application/json; charset=utf-8";

    res.status(response.status);
    res.setHeader("Content-Type", contentType);

    return res.send(body);

  } catch (error) {
    console.error("Proxy Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
