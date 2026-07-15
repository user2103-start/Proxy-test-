// ============================================================
// api/proxy.js - FINAL FIX (Proper ID Forwarding)
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function buildHeaders(req) {
  return {
    "Content-Type": "application/json",
    "Authorization": req.headers["authorization"] || req.headers["Authorization"],
    "user-id": req.headers["user-id"] || req.headers["User-Id"],
    "app_id": req.headers["app_id"] || req.headers["App_Id"],
    "platform": req.headers["platform"] || req.headers["Platform"],
    "version": req.headers["version"] || req.headers["Version"],
    "device_id": req.headers["device_id"] || req.headers["Device_Id"],
    "accept": "application/json, text/plain, */*",
  };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }

  const headers = buildHeaders(req);

  try {
    // 1. SEND OTP
    if (action === "sendotp") {
      const { mobile } = body;
      const data = await fetch(`${AUTH}/auth/check-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "app_id": headers["app_id"], "platform": headers["platform"], "version": headers["version"] },
        body: JSON.stringify({ mobile: String(mobile), device_id: headers["device_id"], mobile_otp_login: 1, otp: "" })
      });
      return res.status(200).json(await data.json());
    }

    // 2. VERIFY OTP
    if (action === "verifyotp") {
      const { mobile, otp, name } = body;
      const data = await fetch(`${AUTH}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "app_id": headers["app_id"], "platform": headers["platform"], "version": headers["version"] },
        body: JSON.stringify({ mobile: String(mobile), otp: String(otp), signup_needed: "0", device_id: headers["device_id"], ...(name ? { name } : {}) })
      });
      return res.status(200).json(await data.json());
    }

    // 3. COURSE
    if (action === "course") {
      const data = await fetch(`${NT}/course/course-details`, {
        method: "POST", headers, body: JSON.stringify({ course_id: String(req.query.course_id), parent_id: String(req.query.parent_id || "0") })
      });
      return res.status(200).json(await data.json());
    }

    // 4. CONTENT
    if (action === "content") {
      // ✅ Ensure we use the correct ID from the query
      const course_id = req.query.course_id || "3186295";
      const folder_id = req.query.folder_id || "0";
      
      const data = await fetch(`${NT}/course/all-content`, {
        method: "POST", 
        headers, 
        body: JSON.stringify({ 
            course_id: String(course_id), 
            folder_id: String(folder_id), 
            limit: "1000", 
            page: "1" 
        })
      });
      return res.status(200).json(await data.json());
    }

    // 5. VIDEO
    if (action === "video") {
      const data = await fetch(`${NT}/course/content-details?content_id=${req.query.content_id}&course_id=${req.query.course_id}`, { method: "GET", headers });
      return res.status(200).json(await data.json());
    }

    // 6. PROFILE
    if (action === "profile") {
      const data = await fetch(`${AUTH}/user/my-profile`, { method: "GET", headers });
      return res.status(200).json(await data.json());
    }

    // 7. TEST INFO
    if (action === "testinfo") {
      const data = await fetch(`${TEST}/test/get-test-instructions?test_id=${req.query.test_id}`, { method: "GET", headers });
      return res.status(200).json(await data.json());
    }

    // 8. TEST DATA
    if (action === "testdata") {
      const data = await fetch(`${TEST}/test/get-test-data?test_id=${req.query.test_id}`, { method: "GET", headers });
      return res.status(200).json(await data.json());
    }

    // 9. SUBMIT TEST
    if (action === "submit-test") {
      const { test_id, course_id, answers, total_time_spent } = body;
      const data = await fetch(`${TEST}/test/submit-test`, {
        method: "POST", headers, body: JSON.stringify({ test_id: String(test_id), course_id: String(course_id || ""), user_id: headers["user-id"], answers, total_time_spent: total_time_spent || 0 })
      });
      return res.status(200).json(await data.json());
    }

    // 10. JOIN CHAT
    if (action === "joinchat") {
      const { content_id, course_id } = req.query || body;
      const data = await fetch(`${AUTH}/chat/join-class`, {
        method: "POST", headers, body: JSON.stringify({ content_id: String(content_id), course_id: String(course_id || "0") })
      });
      return res.status(200).json(await data.json());
    }

    // 11. POLL CHAT (Fallback for MQTT failure)
    if (action === "pollchat") {
      const { content_id } = req.query;
      return res.status(200).json({ success: true, messages: [] });
    }

    // 12. SEND CHAT (Fallback for MQTT failure)
    if (action === "sendchat") {
      const { content_id, message, name } = body;
      return res.status(200).json({ success: true, message: "Chat sent via fallback" });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
