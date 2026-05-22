// api/proxy.js - Pure Proxy (No Frontend Logic)
// Auth: auth.nexttoppers.com
// Course: course.nexttoppers.com
// Test: test.nexttoppers.com

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const APP_ID      = "1772100600";
const USER_COURSE = "3186295";
const USER_TEST   = "4071072";
const DEVICE_ID   = "ae2fa506-85ca-418d-a449-ec5868dc6665";

// Fallback token
const FALLBACK = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjMwNTYxLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1ODY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3NzkzNzM5MTMsImV4cCI6MTc4MTk2NTkxM30.a9aCx3uzCS0W69KsiD_m4vwX11znneFvIn7JKSSPjQU";

// Token cache
const tokenCache = new Map();

// Helper: Check token expiry
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
    return Date.now() >= (payload.exp * 1000 - 5 * 60 * 1000);
  } catch(e) {
    return true;
  }
}

// Helper: Get valid token
async function getValidToken(userToken, refreshToken, sessionId) {
  if (userToken && !isTokenExpired(userToken)) {
    return `Bearer ${userToken}`;
  }
  
  if (sessionId && tokenCache.has(sessionId)) {
    const cached = tokenCache.get(sessionId);
    if (!isTokenExpired(cached.accessToken)) {
      return cached.accessToken;
    }
  }
  
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${AUTH}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      const refreshData = await refreshRes.json();
      const newToken = refreshData.accessToken || refreshData.data?.accessToken;
      if (newToken) {
        const bearerToken = `Bearer ${newToken}`;
        if (sessionId) {
          tokenCache.set(sessionId, { accessToken: bearerToken, refreshToken });
        }
        return bearerToken;
      }
    } catch(e) {}
  }
  
  return userToken ? `Bearer ${userToken}` : FALLBACK;
}

// Headers
function cH(tok) {
  const uid = (() => {
    try {
      if (!tok) return USER_COURSE;
      const clean = tok.startsWith("Bearer ") ? tok.slice(7) : tok;
      const payload = JSON.parse(Buffer.from(clean.split('.')[1], 'base64').toString());
      return String(payload.user_id || USER_COURSE);
    } catch(e) { return USER_COURSE; }
  })();
  
  return {
    "accept": "application/json, text/plain, */*",
    "app_id": APP_ID,
    "authorization": tok || FALLBACK,
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "referer": "https://missionjeet.in/",
    "platform": "3",
    "version": "1",
    "user_id": uid,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };
}

function aH() {
  return {
    "Content-Type": "application/json",
    "app_id": APP_ID,
    "platform": "3",
    "version": "1",
    "origin": "https://missionjeet.in"
  };
}

// Main handler
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-User-Token,X-Refresh-Token,X-Session-Id");
  if (req.method === "OPTIONS") return res.status(200).end();

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }
  body = Object.assign({}, req.query, body);

  const { action } = req.query;
  const userToken = req.headers["x-user-token"] || null;
  const refreshTokenHeader = req.headers["x-refresh-token"] || null;
  const sessionId = req.headers["x-session-id"] || null;

  try {

    // ==================== AUTH ====================
    
    if (action === "sendotp") {
      const { mobile } = body;
      if (!mobile) return res.status(400).json({ success: false, error: "mobile required" });
      const r = await fetch(`${AUTH}/auth/check-user`, {
        method: "POST",
        headers: aH(),
        body: JSON.stringify({ mobile: String(mobile), device_id: DEVICE_ID, mobile_otp_login: 1, otp: "" })
      });
      return res.status(200).json(await r.json());
    }

    if (action === "verifyotp") {
      const { mobile, otp, name } = body;
      if (!mobile || !otp) return res.status(400).json({ success: false, error: "mobile and otp required" });
      const r = await fetch(`${AUTH}/auth/verify-otp`, {
        method: "POST",
        headers: aH(),
        body: JSON.stringify({
          mobile: String(mobile), otp: String(otp), signup_needed: "0",
          device_id: DEVICE_ID, ...(name ? { name } : {})
        })
      });
      const data = await r.json();
      const accessToken = data.data?.accessToken || data.accessToken;
      const refreshToken = data.data?.refreshToken || data.refreshToken;
      
      if (accessToken && refreshToken) {
        const newSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        tokenCache.set(newSessionId, { accessToken: `Bearer ${accessToken}`, refreshToken });
        return res.status(200).json({ success: true, accessToken, refreshToken, sessionId: newSessionId });
      }
      return res.status(200).json(data);
    }

    if (action === "refresh") {
      const { refreshToken } = body;
      const tokenToRefresh = refreshToken || refreshTokenHeader;
      if (!tokenToRefresh) {
        return res.status(400).json({ success: false, error: "Refresh token required" });
      }
      try {
        const refreshRes = await fetch(`${AUTH}/auth/refresh-token`, {
          method: "POST", headers: aH(), body: JSON.stringify({ refreshToken: tokenToRefresh })
        });
        const refreshData = await refreshRes.json();
        const newToken = refreshData.accessToken || refreshData.data?.accessToken;
        if (newToken) {
          if (sessionId && tokenCache.has(sessionId)) {
            const cached = tokenCache.get(sessionId);
            tokenCache.set(sessionId, { accessToken: `Bearer ${newToken}`, refreshToken: cached.refreshToken });
          }
          return res.json({ success: true, accessToken: newToken });
        }
        return res.status(401).json({ success: false, error: "Refresh token expired" });
      } catch(err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // ==================== COURSE APIs ====================

    if (action === "course") {
      const { course_id, parent_id } = req.query;
      if (!course_id) return res.status(400).json({ error: "course_id required" });
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const r = await fetch(`${NT}/course/course-details`, {
        method: "POST", headers: cH(validToken),
        body: JSON.stringify({ course_id: String(course_id), parent_id: String(parent_id || "0") })
      });
      return res.status(200).json(await r.json());
    }

    if (action === "content") {
      const { course_id, folder_id, parent_course_id } = req.query;
      if (!course_id) return res.status(400).json({ error: "course_id required" });
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const r = await fetch(`${NT}/course/all-content`, {
        method: "POST", headers: cH(validToken),
        body: JSON.stringify({
          course_id: String(course_id), folder_id: String(folder_id || "0"),
          is_free: "", keyword: "", limit: "1000", page: "1", parent_course_id: String(parent_course_id || "0")
        })
      });
      return res.status(200).json(await r.json());
    }

    if (action === "video") {
      const { content_id, course_id } = req.query;
      if (!content_id || !course_id) {
        return res.status(400).json({ error: "content_id and course_id required" });
      }
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const r = await fetch(
        `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
        { method: "GET", headers: cH(validToken) }
      );
      return res.status(200).json(await r.json());
    }

    // ==================== TEST APIs ====================

    if (action === "testinfo") {
      const { test_id } = req.query;
      if (!test_id) return res.status(400).json({ error: "test_id required" });
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const r = await fetch(`${TEST}/test/get-test-instructions?test_id=${test_id}`, {
        method: "GET", headers: {
          "accept": "application/json, text/plain, */*", "app_id": APP_ID,
          "authorization": validToken, "platform": "3", "version": "1",
          "user_id": USER_TEST, "origin": "https://missionjeet.in"
        }
      });
      return res.status(200).json(await r.json());
    }

    if (action === "testdata") {
      const { test_id } = req.query;
      if (!test_id) return res.status(400).json({ error: "test_id required" });
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const r = await fetch(`${TEST}/test/get-test-data?test_id=${test_id}`, {
        method: "GET", headers: {
          "accept": "application/json, text/plain, */*", "app_id": APP_ID,
          "authorization": validToken, "platform": "3", "version": "1",
          "user_id": USER_TEST, "origin": "https://missionjeet.in"
        }
      });
      return res.status(200).json(await r.json());
    }

    // ==================== DEFAULT ====================

    return res.status(400).json({
      success: false,
      error: "Invalid action",
      available: ["mat kar lala 🖕🖕"]
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
