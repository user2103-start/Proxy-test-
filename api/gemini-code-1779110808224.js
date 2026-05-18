// api/proxy.js
// Nexttoppers API — Enhanced Production Login, Live Class & Test Proxy System

const NT = "https://course.nexttoppers.com";
const AUTH = "https://auth.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";
const APP_ID = "1772100600";
const DEVICE_ID = "ae2fa506-85ca-418d-a449-ec5068dc6665";

// Fallback credentials if user isn't authenticated
const FALLBACK_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjQ1MDMzLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1MDY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzg0OTQ5NjcsImV4cCI6MTc4MTA4Njk2N30.40g-NIb1n2f8oA7PPIqTgD3Y1zDrsQCpCxBajwpMaJY";
const FALLBACK_USER_ID = "3245033";

// Helper function to build dynamic, authenticated headers
function getHeaders(token, userId) {
  return {
    "accept": "application/json, text/plain, */*",
    "app_id": APP_ID,
    "authorization": token || FALLBACK_TOKEN,
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "platform": "3",
    "referer": "https://missionjeet.in/",
    "user_id": String(userId || FALLBACK_USER_ID),
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "version": "1"
  };
}

// Wrapper for clean POST requests
async function ntPost(baseUrl, endpoint, body, token, userId) {
  const r = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: getHeaders(token, userId),
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Upstream POST ${r.status}: ${r.statusText}`);
  return r.json();
}

// Wrapper for clean GET requests
async function ntGet(baseUrl, endpoint, token, userId) {
  const r = await fetch(`${baseUrl}${endpoint}`, {
    method: "GET",
    headers: getHeaders(token, userId)
  });
  if (!r.ok) throw new Error(`Upstream GET ${r.status}: ${r.statusText}`);
  return r.json();
}

export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Token, X-User-Id");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;
  const body = req.body || {};

  // Extract custom client identities from incoming request headers
  const userToken = req.headers["x-user-token"] || null;
  const userId = req.headers["x-user-id"] || null;
  
  const token = userToken ? `Bearer ${userToken}` : FALLBACK_TOKEN;
  const uid = userId || FALLBACK_USER_ID;

  try {
    // ══════════════════════════════════════════
    // AUTHENTICATION / LOGIN ACTIONS
    // ══════════════════════════════════════════

    if (action === "send-otp") {
      const { mobile } = body;
      if (!mobile) return res.status(400).json({ error: "mobile required" });

      const endpoints = [
        `${AUTH}/auth/send-otp`,
        `${AUTH}/auth/login`,
        `${AUTH}/auth/check-user`,
      ];

      let lastError = null;
      for (const ep of endpoints) {
        try {
          const r = await fetch(ep, {
            method: "POST",
            headers: {
              "accept": "application/json",
              "app_id": APP_ID,
              "content-type": "application/json",
              "origin": "https://missionjeet.in",
              "platform": "3",
              "version": "1"
            },
            body: JSON.stringify({ mobile, device_id: DEVICE_ID, mobile_otp_login: 1, otp: "" })
          });
          const data = await r.json();
          if (data.success || data.responseCode) {
            return res.status(200).json({ ...data, _endpoint: ep });
          }
          lastError = data;
        } catch(e) { lastError = { error: e.message }; }
      }
      return res.status(200).json({ success: false, error: "OTP send failed", details: lastError });
    }

    if (action === "verify-otp") {
      const { mobile, otp } = body;
      if (!mobile || !otp) return res.status(400).json({ error: "mobile and otp required" });

      const r = await fetch(`${AUTH}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "app_id": APP_ID,
          "content-type": "application/json",
          "origin": "https://missionjeet.in",
          "platform": "3",
          "version": "1"
        },
        body: JSON.stringify({ mobile, otp, signup_needed: "0", device_id: DEVICE_ID })
      });

      const data = await r.json();
      const newToken = data.data?.token || data.token || data.data?.access_token || null;
      const newUserId = data.data?.user_id || data.user_id || null;

      return res.status(200).json({
        success: data.success || !!newToken,
        token: newToken,
        user_id: newUserId,
        message: data.message || "",
        raw: data
      });
    }

    // ══════════════════════════════════════════
    // CORE COURSE & STREAMING APIs
    // ══════════════════════════════════════════

    if (action === "course") {
      const data = await ntPost(NT, "/course/course-details", {
        course_id: String(body.course_id),
        parent_id: String(body.parent_id || "0")
      }, token, uid);
      return res.status(200).json(data);
    }

    if (action === "content") {
      const data = await ntPost(NT, "/course/all-content", {
        course_id: String(body.course_id),
        folder_id: String(body.folder_id || "0"),
        is_free: "",
        keyword: "",
        limit: "1000",
        page: "1",
        parent_course_id: String(body.parent_course_id || "0")
      }, token, uid);
      return res.status(200).json(data);
    }

    // Fixed Video API Structure to bypass empty responses
    if (action === "video") {
      const content_id = req.query.content_id || body.content_id;
      const course_id = req.query.course_id || body.course_id;

      if (!content_id || !course_id) {
        return res.status(400).json({ error: "content_id and course_id required" });
      }

      // Some versions of upstream require parameters inside a POST request body, others require analytical tokens.
      // We fall back cleanly or request content-details via explicit URL construction
      const data = await ntGet(NT, `/course/content-details?content_id=${content_id}&course_id=${course_id}`, token, uid);
      return res.status(200).json(data);
    }

    // Dynamic Live filtering implementation matching exact structural parameters
    if (action === "live") {
      const targetCourseId = body.course_id || req.query.course_id;
      const data = await ntPost(NT, "/course/all-content", {
        course_id: String(targetCourseId),
        folder_id: "0",
        is_free: "",
        keyword: "",
        limit: "100",
        page: "1",
        parent_course_id: "0"
      }, token, uid);

      const items = data.data || [];
      
      // Filter exactly matching: file_type = 2, video_type = 3, is_live = 1
      const liveClasses = items.filter(item => {
        const d = item.data || {};
        return (
          item.type === "live" || 
          d.content_type === 4 ||
          (d.file_type === 2 && d.video_type === 3 && d.is_live === 1)
        );
      });

      return res.status(200).json({ ...data, data: liveClasses });
    }

    // ══════════════════════════════════════════
    // ENHANCED TEST ENDPOINTS (JEE / NEET / GENERAL)
    // ══════════════════════════════════════════

    if (action === "test-list") {
      const data = await ntPost(NT, "/course/all-content", {
        course_id: String(body.course_id),
        folder_id: String(body.folder_id || "0"),
        is_free: "",
        keyword: "",
        limit: "1000",
        page: "1",
        parent_course_id: "0"
      }, token, uid);

      const items = data.data || [];
      const tests = items.filter(i => 
        i.type === "test" || 
        i.data?.file_type === 3 || 
        i.data?.content_type === 3
      );
      return res.status(200).json({ ...data, data: tests });
    }

    if (action === "test-info") {
      const test_id = req.query.test_id || body.test_id;
      if (!test_id) return res.status(400).json({ error: "test_id required" });

      const data = await ntGet(TEST, `/test/get-test-instructions?test_id=${test_id}`, token, uid);
      return res.status(200).json(data);
    }

    if (action === "test-data") {
      const test_id = req.query.test_id || body.test_id;
      if (!test_id) return res.status(400).json({ error: "test_id required" });

      const data = await ntGet(TEST, `/test/get-test-data?test_id=${test_id}`, token, uid);
      return res.status(200).json(data);
    }

    // [NEW ENDPOINT 1] - Get Test Results Analysis
    if (action === "test-result") {
      const test_id = req.query.test_id || body.test_id;
      if (!test_id) return res.status(400).json({ error: "test_id required" });

      const data = await ntGet(TEST, `/test/get-user-test-report?test_id=${test_id}`, token, uid);
      return res.status(200).json(data);
    }

    // [NEW ENDPOINT 2] - Get Leaderboards / Rankings (Crucial for JEE/NEET test folders)
    if (action === "test-leaderboard") {
      const test_id = req.query.test_id || body.test_id;
      if (!test_id) return res.status(400).json({ error: "test_id required" });

      const data = await ntGet(TEST, `/test/get-test-leaderboard?test_id=${test_id}&limit=100&page=1`, token, uid);
      return res.status(200).json(data);
    }

    // Fallback error handler for unrecognized route queries
    return res.status(400).json({
      success: false,
      error: "Invalid proxy action requested",
      available: [
        "send-otp", "verify-otp", "course", "content", 
        "video", "live", "test-list", "test-info", 
        "test-data", "test-result", "test-leaderboard"
      ]
    });

  } catch (err) {
    console.error("[PROXY SYSTEM EXCEPTION]", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}