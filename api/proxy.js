// ============================================================
// api/proxy.js - PRODUCTION PROXY WITH ENROLLMENT BYPASS
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
  res.setHeader("Access-Control-Allow-Headers", 
    "Content-Type, Authorization, User-Id, X-Requested-With, Accept, Origin, " +
    "App-Id, Platform, Version, Device-Id, device_id, app_id, user-id, " +
    "x-app-id, x-platform, x-version, x-device-id"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ============================================================
// HEADER BUILDER
// ============================================================
function buildForwardHeaders(req) {
  const headers = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "referer": "https://missionjeet.in/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  const forwardKeys = ["authorization", "user-id", "app_id", "platform", "version", "device_id"];
  for (const key of forwardKeys) {
    const value = req.headers[key.toLowerCase()] || req.headers[key];
    if (value) {
      headers[key] = value;
    }
  }

  return headers;
}

// ============================================================
// GENERATE FAKE MQTT CREDENTIALS (For unenrolled users)
// ============================================================
function generateMQTTCredentials(videoId, userId, courseId) {
  return {
    mqtt_username: `user_${userId}`,
    mqtt_password: `pass_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    client_id: `client_${userId}_${Date.now()}`,
    public_chat_node: `live/${courseId}/${videoId}`,
    mqtt_chat_url: "mqtt-ws.nexttoppers.com",
    mqtt_port: 8084,
    is_fallback: true
  };
}

// ============================================================
// MAIN ROUTER PROCESSOR
// ============================================================
module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
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
  const headers = buildForwardHeaders(req);

  try {
    // 1. SEND OTP
    if (action === "sendotp") {
      const { mobile } = body;
      if (!mobile) return res.status(400).json({ success: false, error: "mobile required" });
      const response = await fetch(`${AUTH}/auth/check-user`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "app_id": headers["app_id"] || "1772100600", 
          "platform": headers["platform"] || "3", 
          "version": headers["version"] || "1" 
        },
        body: JSON.stringify({ mobile: String(mobile), device_id: headers["device_id"] || "", mobile_otp_login: 1, otp: "" })
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
          "app_id": headers["app_id"] || "1772100600", 
          "platform": headers["platform"] || "3", 
          "version": headers["version"] || "1" 
        },
        body: JSON.stringify({ mobile: String(mobile), otp: String(otp), signup_needed: "0", device_id: headers["device_id"] || "", ...(name ? { name } : {}) })
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
      const data = await response.json();
      return res.status(200).json(data);
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
        body: JSON.stringify({ test_id: String(test_id), course_id: String(course_id || ""), user_id: headers["user-id"], answers, total_time_spent: total_time_spent || 0 })
      });
      return res.status(200).json(await response.json());
    }

    // ============================================================
    // ✅ JOIN CHAT - WITH ENROLLMENT BYPASS
    // ============================================================
    if (action === "joinchat") {
      let video_id = body?.video_id || req.query?.video_id;
      let content_id = body?.content_id || req.query?.content_id;
      let finalId = video_id || content_id;
      let course_id = body?.course_id || req.query?.course_id || "0";
      
      console.log("📡 JoinChat Request:", { video_id, content_id, finalId, course_id });
      
      if (!finalId) {
        return res.status(400).json({ success: false, error: "video_id is required" });
      }

      // Get user ID from headers
      const userId = headers["user-id"] || headers["User-Id"] || "unknown";

      try {
        // Try to get real credentials from the API
        const response = await fetch(`${AUTH}/chat/join-class`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ 
            video_id: String(finalId), 
            course_id: String(course_id) 
          })
        });
        
        const data = await response.json();
        
        console.log("📡 Real API Response:", JSON.stringify(data, null, 2));
        
        // ✅ ENROLLMENT BYPASS: If user is not enrolled, generate fake credentials
        if (data.responseCode === 403 || data.message?.includes("not enrolled")) {
          console.log("⚠️ User not enrolled - Generating fake credentials");
          
          const fakeCreds = generateMQTTCredentials(finalId, userId, course_id);
          
          return res.status(200).json({
            success: true,
            responseCode: 200,
            message: "Generated fallback credentials (enrollment bypass)",
            data: fakeCreds,
            bypassed: true
          });
        }
        
        // If API returns success, forward the real credentials
        return res.status(200).json(data);
        
      } catch (error) {
        console.error("❌ Error fetching chat credentials:", error);
        
        // Generate fake credentials as fallback
        const fakeCreds = generateMQTTCredentials(finalId, userId, course_id);
        
        return res.status(200).json({
          success: true,
          responseCode: 200,
          message: "Generated fallback credentials (API error)",
          data: fakeCreds,
          bypassed: true,
          fallback: true
        });
      }
    }

    // ============================================================
    // ✅ POLL CHAT (Fallback)
    // ============================================================
    if (action === "pollchat") {
      const { content_id } = req.query;
      try {
        const response = await fetch(`${AUTH}/chat/poll?content_id=${content_id}`, {
          method: "GET",
          headers: headers
        });
        return res.status(200).json(await response.json());
      } catch(e) {
        return res.status(200).json({ success: true, messages: [] });
      }
    }

    // ============================================================
    // ✅ SEND CHAT VIA HTTP (Fallback)
    // ============================================================
    if (action === "sendchat") {
      const { content_id, message, name } = body;
      if (!content_id || !message) {
        return res.status(400).json({ success: false, error: "content_id and message required" });
      }
      try {
        const response = await fetch(`${AUTH}/chat/send`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ 
            content_id: String(content_id), 
            message: String(message),
            name: String(name || "Student")
          })
        });
        return res.status(200).json(await response.json());
      } catch(e) {
        return res.status(200).json({ success: true, message: "Message sent (fallback)" });
      }
    }

    // 10. STATS
    if (action === "stats") {
      return res.status(200).json({ success: true, status: "healthy", activeUsersCached: requestCounts.size, timestamp: Date.now() });
    }

    return res.status(400).json({ success: false, error: "Invalid action" });

  } catch (error) {
    console.error("❌ Proxy Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal server crash" });
  }
};
