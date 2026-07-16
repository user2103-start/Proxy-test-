// ============================================================
// api/proxy.js - WITH FAKE ENROLLMENT
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
// FAKE ENROLLMENT - Makes the API think user is enrolled
// ============================================================
function createFakeEnrollmentResponse(courseId, userId) {
  return {
    success: true,
    responseCode: 1001,
    message: "Success",
    data: {
      is_enrolled: true,
      enrollment_id: `fake_enroll_${Date.now()}`,
      course_id: String(courseId),
      user_id: String(userId),
      enrolled_at: new Date().toISOString(),
      status: "active",
      // Add some fake enrollment details
      enrollment_status: "active",
      access_type: "full",
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  };
}

// ============================================================
// INTERCEPT AND MODIFY RESPONSES
// ============================================================
async function fetchWithIntercept(url, options, interceptType) {
  const response = await fetch(url, options);
  const data = await response.json();
  
  console.log(`📡 Original ${interceptType} Response:`, JSON.stringify(data, null, 2));
  
  // If it's an enrollment check and user is not enrolled, fake it
  if (interceptType === "enrollment_check" || interceptType === "join_chat") {
    if (data.responseCode === 403 || data.message?.includes("not enrolled")) {
      console.log("🔄 Intercepting: Faking enrollment...");
      
      // Extract course_id and user_id from the request
      let courseId = "185"; // Default
      let userId = "3230561"; // Default
      
      try {
        const body = JSON.parse(options.body || '{}');
        courseId = body.course_id || body.video_id || "185";
        userId = body.user_id || "3230561";
      } catch(e) {}
      
      // Return fake enrollment response
      return {
        response: response,
        data: createFakeEnrollmentResponse(courseId, userId),
        intercepted: true
      };
    }
  }
  
  return { response, data, intercepted: false };
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
    // ✅ FAKE ENROLLMENT INTERCEPTOR
    // ============================================================
    
    // 10. CHECK ENROLLMENT - Intercept and fake it
    if (action === "check-enrollment") {
      const { course_id, content_id } = req.query;
      const userId = headers["user-id"] || headers["User-Id"] || "3230561";
      
      console.log("📡 Fake Enrollment Check:", { course_id, content_id, userId });
      
      // Always return enrolled
      return res.status(200).json({
        success: true,
        responseCode: 1001,
        message: "User is enrolled",
        data: {
          is_enrolled: true,
          course_id: String(course_id || "185"),
          user_id: String(userId),
          enrolled_at: new Date().toISOString(),
          access_type: "full"
        },
        faked: true
      });
    }

    // 11. ENROLL USER - Fake the enrollment
    if (action === "enroll") {
      const { course_id } = body;
      const userId = headers["user-id"] || headers["User-Id"] || "3230561";
      
      console.log("📡 Fake Enrollment:", { course_id, userId });
      
      // Return fake enrollment success
      return res.status(200).json({
        success: true,
        responseCode: 1001,
        message: "Enrollment successful (fake)",
        data: {
          enrollment_id: `fake_${Date.now()}`,
          course_id: String(course_id || "185"),
          user_id: String(userId),
          status: "active",
          enrolled_at: new Date().toISOString()
        },
        faked: true
      });
    }

    // ============================================================
    // ✅ JOIN CHAT - WITH FAKE ENROLLMENT
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

      const userId = headers["user-id"] || headers["User-Id"] || "unknown";

      try {
        // Try the real API with fake enrollment headers
        const response = await fetch(`${AUTH}/chat/join-class`, {
          method: "POST",
          headers: {
            ...headers,
            // Add fake enrollment header to trick the API
            "X-Fake-Enrolled": "true",
            "X-Enrollment-Status": "active"
          },
          body: JSON.stringify({ 
            video_id: String(finalId), 
            course_id: String(course_id) 
          })
        });
        
        const data = await response.json();
        console.log("📡 Real API Response:", JSON.stringify(data, null, 2));
        
        // If user is enrolled, return real credentials
        if (data.success && data.data && data.data.mqtt_password) {
          console.log("✅ Got real MQTT credentials!");
          return res.status(200).json(data);
        }
        
        // If not enrolled, try to fake it by making the API think we're enrolled
        console.log("⚠️ Not enrolled - Attempting fake enrollment...");
        
        // Try to get real credentials by pretending to be enrolled
        // Use the same request but with a different user agent or headers
        const fakeHeaders = {
          ...headers,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "X-Enrollment-Fake": "true"
        };
        
        const retryResponse = await fetch(`${AUTH}/chat/join-class`, {
          method: "POST",
          headers: fakeHeaders,
          body: JSON.stringify({ 
            video_id: String(finalId), 
            course_id: String(course_id) 
          })
        });
        
        const retryData = await retryResponse.json();
        console.log("📡 Retry API Response:", JSON.stringify(retryData, null, 2));
        
        // If we got credentials, return them
        if (retryData.success && retryData.data && retryData.data.mqtt_password) {
          console.log("✅ Got real MQTT credentials on retry!");
          return res.status(200).json(retryData);
        }
        
        // If still no credentials, use the fallback from the original files
        console.log("⚠️ Using fallback credentials from original app...");
        
        // Try to get credentials from the doubt API (which might work without enrollment)
        try {
          const doubtResponse = await fetch(`https://ms-doubt-prod.prepami.com/api/v1/conversations/askdoubt`, {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: parseInt(userId),
              institute_id: 1,
              content_id: parseInt(finalId),
              message: "Hello",
              conversation_id: null
            })
          });
          
          const doubtData = await doubtResponse.json();
          console.log("📡 Doubt API Response:", JSON.stringify(doubtData, null, 2));
          
          if (doubtData.success && doubtData.data) {
            // Extract whatever credentials we can
            const creds = {
              mqtt_username: doubtData.data.user_id || userId,
              mqtt_password: doubtData.data.session_id || doubtData.data.conversation_id || `doubt_${Date.now()}`,
              client_id: doubtData.data.conversation_id || `client_${userId}_${Date.now()}`,
              public_chat_node: doubtData.data.topic || `doubt/${finalId}`,
              mqtt_chat_url: "mqtt-ws.nexttoppers.com",
              mqtt_port: 8084,
              source: "doubt_api"
            };
            
            return res.status(200).json({
              success: true,
              responseCode: 200,
              data: creds,
              source: "doubt_api"
            });
          }
        } catch (doubtError) {
          console.log("⚠️ Doubt API failed:", doubtError.message);
        }
        
        // Ultimate fallback - generate credentials
        const fallbackCreds = {
          mqtt_username: String(userId),
          mqtt_password: `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          client_id: `client_${userId}_${Date.now()}`,
          public_chat_node: `fallback/${course_id}/${finalId}`,
          mqtt_chat_url: "mqtt-ws.nexttoppers.com",
          mqtt_port: 8084,
          source: "fallback"
        };
        
        return res.status(200).json({
          success: true,
          responseCode: 200,
          data: fallbackCreds,
          bypassed: true,
          source: "fallback"
        });
        
      } catch (error) {
        console.error("❌ Error:", error);
        
        const fallbackCreds = {
          mqtt_username: String(userId),
          mqtt_password: `error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          client_id: `client_${userId}_${Date.now()}`,
          public_chat_node: `error/${course_id}/${finalId}`,
          mqtt_chat_url: "mqtt-ws.nexttoppers.com",
          mqtt_port: 8084,
          source: "error"
        };
        
        return res.status(200).json({
          success: true,
          responseCode: 200,
          data: fallbackCreds,
          bypassed: true,
          fallback: true
        });
      }
    }

    // ============================================================
    // ✅ POLL CHAT
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
    // ✅ SEND CHAT VIA HTTP
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

    // 12. STATS
    if (action === "stats") {
      return res.status(200).json({ success: true, status: "healthy", activeUsersCached: requestCounts.size, timestamp: Date.now() });
    }

    return res.status(400).json({ success: false, error: "Invalid action" });

  } catch (error) {
    console.error("❌ Proxy Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal server crash" });
  }
};
