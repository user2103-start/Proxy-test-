const COURSE_API = "https://course.nexttoppers.com";
const TEST_API = "https://test.nexttoppers.com";
const AUTH_API = "https://auth.nexttoppers.com";

// ========================================
// ADD YOUR TOKEN + USER ID HERE
// ========================================

const DEFAULT_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjMwNTYxLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYzZiYWYwMGYtOWVjYy00MmY4LWI4YTQtZjZhNDg1OWJjYTI4IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzg1NzE1MDcsImV4cCI6MTc4MTE2MzUwN30.W4QEqz0uPGmeifcJpn_5g4xW5V65ni_W6v5VCeZy4tw'";
const DEFAULT_USER_ID = "ADD_YOUR_USER_ID_HERE";

// ========================================

module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, user_id, app_id, platform, version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    const { target, endpoint } = req.query;

    if (!target || !endpoint) {
      return res.status(400).json({
        success: false,
        error: "target and endpoint required"
      });
    }

    let BASE = "";

    if (target === "course") {
      BASE = COURSE_API;
    }

    else if (target === "test") {
      BASE = TEST_API;
    }

    else if (target === "auth") {
      BASE = AUTH_API;
    }

    else {
      return res.status(400).json({
        success: false,
        error: "invalid target"
      });
    }

    const url = `${BASE}/${endpoint}`;

    const headers = {

      "accept": "application/json, text/plain, */*",

      "content-type": "application/json",

      // Uses request header OR fallback token
      "authorization":
        req.headers.authorization || DEFAULT_TOKEN,

      "user_id":
        req.headers.user_id || DEFAULT_USER_ID,

      "app_id":
        req.headers.app_id || "1772100600",

      "platform":
        req.headers.platform || "3",

      "version":
        req.headers.version || "1",

      "origin": "https://missionjeet.in",

      "referer": "https://missionjeet.in/",

      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"

    };

    const response = await fetch(url, {
      method: req.method,
      headers,

      body:
        req.method === "GET"
          ? undefined
          : JSON.stringify(req.body || {})
    });

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (err) {

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }
};