// ============================================================
// api/proxy.js - MULTI-USER & LIVE MQTT OPTIMIZED VERSION
// Mission JEET Proxy - Supporting 200+ Dynamic Users Flawlessly
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const APP_ID      = "1772100600";
const USER_COURSE = "3186295";
const USER_TEST   = "4071072";
const DEVICE_ID   = "2cfdeaea-ab62-41f8-9f7d-6568334e1826";

// Fallback Default Token (For Testing Only)
const FALLBACK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjMwNTYxLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiMmNmZGVhZWEtYWI2Mi00MWY4LTlmN2QtNjU2ODMzNGUxODI2IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzk4ODU3MzAsImV4cCI6MTc4MjQ3NzczMH0.AeKMUiNGAeqXkMixTmyd6j6HM3gauNyafeba3fvPvWg";

const requestCounts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimit = requestCounts.get(ip);
  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (userLimit.count >= 150) return false; // Increased limit slightly for live chat bursts
  userLimit.count++;
  return true;
}

// ============================================================
// DYNAMIC TOKEN HANDLING (No more hardcoding collision)
// ============================================================
function getUserIdFromToken(token) {
  try {
    if (!token) return USER_COURSE;
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
    return String(payload.user_id || USER_COURSE);
  } catch(e) {
    return USER_COURSE;
  }
}

function buildHeaders(accessToken, userId) {
  return {
    "accept": "application/json, text/plain, */*",
    "app_id": APP_ID,
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "referer": "https://missionjeet.in/",
    "platform": "3",
    "version": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "authorization": accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
    "user_id": String(userId)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, User-Id");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ success: false, error: "Too many requests. Slow down bro!" });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }
  body = Object.assign({}, req.query, body);

  const { action } = req.query;

  // 🔄 CRITICAL: Dynamically extract credentials sent by frontend or use fallback
  let userToken = req.headers["authorization"] || body.token || FALLBACK_TOKEN;
  let userId = req.headers["user-id"] || body.user_id || getUserIdFromToken(userToken);

  try {
    // 1. SEND OTP
    if (action === "sendotp") {
      const { mobile } = body;
      if (!mobile) return res.status(400).json({ success: false, error: "mobile required" });
      const response = await fetch(`${AUTH}/auth/check-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "app_id": APP_ID, "platform": "3", "version": "1" },
        body: JSON.stringify({ mobile: String(mobile), device_id: DEVICE_ID, mobile_otp_login: 1, otp: "" })
      });
      return res.status(200).json(await response.json());
    }

    // 2. VERIFY OTP
    if (action === "verifyotp") {
      const { mobile, otp, name } = body;
      if (!mobile || !otp) return res.status(400).json({ success: false, error: "mobile & otp required" });
      const response = await fetch(`${AUTH}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "app_id": APP_ID, "platform": "3", "version": "1" },
        body: JSON.stringify({ mobile: String(mobile), otp: String(otp), signup_needed: "0", device_id: DEVICE_ID, ...(name ? { name } : {}) })
      });
      return res.status(200).json(await response.json());
    }

    // 3. COURSE DETAILS
    if (action === "course") {
      const { course_id, parent_id } = req.query;
      const response = await fetch(`${NT}/course/course-details`, {
        method: "POST",
        headers: buildHeaders(userToken, userId),
        body: JSON.stringify({ course_id: String(course_id), parent_id: String(parent_id || "0") })
      });
      return res.status(200).json(await response.json());
    }

    // 4. CONTENT LIST
    if (action === "content") {
      const { course_id, folder_id, parent_course_id } = req.query;
      const response = await fetch(`${NT}/course/all-content`, {
        method: "POST",
        headers: buildHeaders(userToken, userId),
        body: JSON.stringify({
          course_id: String(course_id), folder_id: String(folder_id || "0"),
          is_free: "", keyword: "", limit: "1000", page: "1", parent_course_id: String(parent_course_id || "0")
        })
      });
      return res.status(200).json(await response.json());
    }

    // 5. VIDEO/PDF SOURCE DETAILS
    if (action === "video") {
      const { content_id, course_id } = req.query;
      const response = await fetch(`${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`, {
        method: "GET",
        headers: buildHeaders(userToken, userId)
      });
      return res.status(200).json(await response.json());
    }

    // 6. DYNAMIC LIVE CHET DATA EXTRACTOR (NEW 🚀)
    if (action === "livechat") {
      const { content_id, course_id } = req.query;
      if (!content_id || !course_id) return res.status(400).json({ error: "content_id and course_id required" });

      const response = await fetch(`${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`, {
        method: "GET",
        headers: buildHeaders(userToken, userId)
      });
      const data = await response.json();

      if (data.success && data.data) {
        const liveInfo = data.data;
        return res.status(200).json({
          success: true,
          title: liveInfo.title,
          streamUrl: liveInfo.file_url,
          thumbnailUrl: liveInfo.thumbnail,
          mqttHost: "mqtt-ws.nexttoppers.com",
          publicTopic: `${liveInfo.chat_node || liveInfo.content_id}_public`,
          settingTopic: `${liveInfo.chat_node || liveInfo.content_id}_setting`,
          liveFrom: liveInfo.live_date_timestamp || Math.floor(Date.now() / 1000),
          liveTo: (liveInfo.live_date_timestamp || Math.floor(Date.now() / 1000)) + 10800 // 3 hours duration window default
        });
      }
      return res.status(400).json({ success: false, error: "Live class payload data mapping failed" });
    }

    // 7. PRE-AUTHENTICATED WEBSOCKET LINK DISPATCHER (NEW 🚀)
    if (action === "mqtt-url") {
      const cleanToken = userToken.startsWith("Bearer ") ? userToken.slice(7) : userToken;
      const wsUrl = `wss://mqtt-ws.nexttoppers.com/mqtt?uid=${userId}&token=${encodeURIComponent(cleanToken)}&appId=${APP_ID}`;
      return res.status(200).json({ success: true, wsUrl: wsUrl, clientId: String(userId) });
    }

    // 8. USER PROFILE
    if (action === "profile") {
      const response = await fetch(`${AUTH}/user/my-profile`, {
        method: "GET", headers: buildHeaders(userToken, userId)
      });
      return res.status(200).json(await response.json());
    }

    // 9. TEST INFO
    if (action === "testinfo") {
      const { test_id } = req.query;
      const response = await fetch(`${TEST}/test/get-test-instructions?test_id=${test_id}`, {
        method: "GET", headers: buildHeaders(userToken, userId)
      });
      return res.status(200).json(await response.json());
    }

    // 10. TEST DATA
    if (action === "testdata") {
      const { test_id } = req.query;
      const response = await fetch(`${TEST}/test/get-test-data?test_id=${test_id}`, {
        method: "GET", headers: buildHeaders(userToken, userId)
      });
      return res.status(200).json(await response.json());
    }

    // 11. SUBMIT TEST
    if (action === "submit-test") {
      const { test_id, course_id, answers, total_time_spent } = body;
      const response = await fetch(`${TEST}/test/submit-test`, {
        method: "POST",
        headers: buildHeaders(userToken, userId),
        body: JSON.stringify({ test_id: String(test_id), course_id: String(course_id || ""), user_id: userId, answers, total_time_spent: total_time_spent || 0 })
      });
      return res.status(200).json(await response.json());
    }

    // 12. PROXY STATS
    if (action === "stats") {
      return res.status(200).json({ success: true, status: "healthy", activeUsersCached: requestCounts.size, timestamp: Date.now() });
    }

    return res.status(400).json({ success: false, error: "Invalid action routing query options" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Internal server crash" });
  }
};
