// ============================================================
// api/proxy.js - PRODUCTION PROXY FOR 500+ USERS (FIXED)
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const requestCounts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimit = requestCounts.get(ip);
  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (userLimit.count >= 150) return false;
  userLimit.count++;
  return true;
}

// ============================================================
// CORS HANDLER
// ============================================================
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, User-Id, X-Requested-With, Accept, Origin, App-Id, Platform, Version, Device-Id");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ============================================================
// HEADER BUILDER - Uses EXACTLY what the frontend sends (FIXED)
// ============================================================
function buildForwardHeaders(req) {
  const headers = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "referer": "https://missionjeet.in/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  // ✅ Fix: Handle both lowercase and uppercase header names
  const rawHeaders = req.headers;
  
  // Extract authorization (Vercel converts it to lowercase)
  if (rawHeaders.authorization) {
    headers["authorization"] = rawHeaders.authorization;
  } else if (rawHeaders.Authorization) {
    headers["authorization"] = rawHeaders.Authorization;
  }

  // Extract user-id
  if (rawHeaders["user-id"]) {
    headers["user-id"] = rawHeaders["user-id"];
  } else if (rawHeaders["User-Id"]) {
    headers["user-id"] = rawHeaders["User-Id"];
  }

  // Extract app_id
  if (rawHeaders["app_id"]) {
    headers["app_id"] = rawHeaders["app_id"];
  } else if (rawHeaders["App_Id"]) {
    headers["app_id"] = rawHeaders["App_Id"];
  }

  // Extract platform
  if (rawHeaders["platform"]) {
    headers["platform"] = rawHeaders["platform"];
  } else if (rawHeaders["Platform"]) {
    headers["platform"] = rawHeaders["Platform"];
  }

  // Extract version
  if (rawHeaders["version"]) {
    headers["version"] = rawHeaders["version"];
  } else if (rawHeaders["Version"]) {
    headers["version"] = rawHeaders["Version"];
  }

  // Extract device_id
  if (rawHeaders["device_id"]) {
    headers["device_id"] = rawHeaders["device_id"];
  } else if (rawHeaders["Device_Id"]) {
    headers["device_id"] = rawHeaders["Device_Id"];
  }

  // ✅ LOGGING: See what headers arrived at the proxy
  console.log("🔹 Headers received at proxy:", {
    authorization: headers["authorization"] ? "✅ Present" : "❌ Missing",
    "user-id": headers["user-id"] || "❌ Missing",
    app_id: headers["app_id"] || "❌ Missing",
    platform: headers["platform"] || "❌ Missing",
    version: headers["version"] || "❌ Missing",
    device_id: headers["device_id"] || "❌ Missing"
  });

  return headers;
}

// ============================================================
// MAIN ROUTER PROCESSOR
// ============================================================
module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
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

  // ✅ Build headers using ONLY what the frontend sent
  const headers = buildForwardHeaders(req);

  // ✅ Fallback to default values if headers are missing
  const appId = headers["app_id"] || "1772100600";
  const platform = headers["platform"] || "3";
  const version = headers["version"] || "1";
  const deviceId = headers["device_id"] || "";
  const userId = headers["user-id"] || body.user_id || "";

  try {
    // 1. SEND OTP
    if (action === "sendotp") {
      const { mobile } = body;
      if (!mobile) return res.status(400).json({ success: false, error: "mobile required" });
      const response = await fetch(`${AUTH}/auth/check-user`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "app_id": appId, 
          "platform": platform, 
          "version": version 
        },
        body: JSON.stringify({ mobile: String(mobile), device_id: deviceId, mobile_otp_login: 1, otp: "" })
      });
      return res.status(200).json(await response.json());
    }

    // 2. VERIFY OTP
    if (action === "verifyotp") {
      const { mobile, otp, name } = body;
      if (!mobile || !otp) return res.status(400).json({ success: false, error: "mobile & otp required" });
      const response = await fetch(`${AUTH}/auth/verify-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "app_id": appId, 
          "platform": platform, 
          "version": version 
        },
        body: JSON.stringify({ mobile: String(mobile), otp: String(otp), signup_needed: "0", device_id: deviceId, ...(name ? { name } : {}) })
      });
      return res.status(200).json(await response.json());
    }

    // 3. COURSE DETAILS
    if (action === "course") {
      const { course_id, parent_id } = req.query;
      const response = await fetch(`${NT}/course/course-details`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ course_id: String(course_id), parent_id: String(parent_id || "0") })
      });
      return res.status(200).json(await response.json());
    }

    // 4. CONTENT LIST
    if (action === "content") {
      const { course_id, folder_id, parent_course_id } = req.query;
      const response = await fetch(`${NT}/course/all-content`, {
        method: "POST",
        headers: headers,
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
        headers: headers
      });
      return res.status(200).json(await response.json());
    }

    // 6. USER PROFILE
    if (action === "profile") {
      const response = await fetch(`${AUTH}/user/my-profile`, {
        method: "GET", headers: headers
      });
      return res.status(200).json(await response.json());
    }

    // 7. TEST INFO
    if (action === "testinfo") {
      const { test_id } = req.query;
      const response = await fetch(`${TEST}/test/get-test-instructions?test_id=${test_id}`, {
        method: "GET", headers: headers
      });
      return res.status(200).json(await response.json());
    }

    // 8. TEST DATA
    if (action === "testdata") {
      const { test_id } = req.query;
      const response = await fetch(`${TEST}/test/get-test-data?test_id=${test_id}`, {
        method: "GET", headers: headers
      });
      return res.status(200).json(await response.json());
    }

    // 9. SUBMIT TEST
    if (action === "submit-test") {
      const { test_id, course_id, answers, total_time_spent } = body;
      const response = await fetch(`${TEST}/test/submit-test`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ test_id: String(test_id), course_id: String(course_id || ""), user_id: userId, answers, total_time_spent: total_time_spent || 0 })
      });
      return res.status(200).json(await response.json());
    }

    // ============================================================
    // ✅ NEW: JOIN CHAT (Required for Live Chat)
    // ============================================================
    if (action === "joinchat") {
      const { content_id, course_id } = req.query || req.body || {};
      
      if (!content_id) {
        return res.status(400).json({ success: false, error: "content_id is required" });
      }

      const response = await fetch(`${AUTH}/chat/join-class`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ 
          content_id: String(content_id), 
          course_id: String(course_id || "0") 
        })
      });
      
      return res.status(200).json(await response.json());
    }

    // 10. STATS
    if (action === "stats") {
      return res.status(200).json({ success: true, status: "healthy", activeUsersCached: requestCounts.size, timestamp: Date.now() });
    }

    return res.status(400).json({ success: false, error: "Invalid action routing query options" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Internal server crash" });
  }
};
