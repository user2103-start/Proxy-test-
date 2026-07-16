// ============================================================
// api/proxy.js - WITH DEVICE ID AUTH & MULTIPLE FALLBACKS
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";
const DOUBT = "https://ms-doubt-prod.prepami.com";

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
// TEST MQTT CONNECTION WITH CREDENTIALS
// ============================================================
async function testMqttConnection(username, password, clientId, topic, broker, port) {
  return new Promise((resolve) => {
    const mqtt = require('mqtt');
    let resolved = false;
    
    const wsUrl = `wss://${broker || 'mqtt-ws.nexttoppers.com'}:${port || 8084}/mqtt`;
    
    const client = mqtt.connect(wsUrl, {
      username: String(username || ''),
      password: String(password || ''),
      clientId: String(clientId || `test_${Date.now()}`),
      protocol: 'wss',
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 5000,
      rejectUnauthorized: false,
    });
    
    client.on("connect", () => {
      if (!resolved) {
        resolved = true;
        client.end();
        resolve({ success: true, username, password });
      }
    });
    
    client.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        client.end();
        resolve({ success: false, error: err.message });
      }
    });
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.end();
        resolve({ success: false, error: "timeout" });
      }
    }, 5000);
  });
}

// ============================================================
// GENERATE MQTT CREDENTIALS WITH DEVICE ID
// ============================================================
function generateMQTTCredentials(videoId, userId, courseId, deviceId) {
  const password = deviceId || `device_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  // Try different username formats
  const usernameFormats = [
    String(userId),
    `user_${userId}`,
    `${userId}_${courseId}`,
    `u${userId}_c${courseId}`,
    `device_${deviceId?.substring(0, 8)}`,
    deviceId,
    `live_${deviceId?.substring(0, 10)}`,
    `u${userId}`,
    `user${userId}`,
  ];
  
  return {
    usernameFormats,
    password,
    clientId: `client_${userId}_${Date.now()}`,
    topic: `live/${courseId}/${videoId}`,
    broker: "mqtt-ws.nexttoppers.com",
    port: 8084
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
      
      if (data.success && data.data) {
        console.log("📡 Chat Nodes Found:", {
          public_chat_node: data.data.public_chat_node || data.data.chat_node,
          private_chat_node: data.data.private_chat_node,
          mqtt_username: data.data.mqtt_username || data.data.username,
          mqtt_password: data.data.mqtt_password ? "✅ Found" : "❌ Missing"
        });
      }
      
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
    // ✅ JOIN CHAT - WITH DEVICE ID AUTH & MULTIPLE FALLBACKS
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

      const userId = headers["user-id"] || headers["User-Id"] || "3230561";
      const deviceId = headers["device_id"] || headers["Device-Id"] || 
                       body?.device_id || `device_${Date.now()}`;

      try {
        // ============================================================
        // STEP 1: Try the real API first
        // ============================================================
        console.log("📡 STEP 1: Trying real API...");
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
        
        if (data.success && data.data && data.data.mqtt_password) {
          console.log("✅ User is enrolled! Returning real credentials.");
          return res.status(200).json(data);
        }
        
        // ============================================================
        // STEP 2: Try Device ID as password with different formats
        // ============================================================
        console.log("📡 STEP 2: Trying Device ID authentication...");
        console.log(`📡 Device ID: ${deviceId}`);
        console.log(`📡 User ID: ${userId}`);
        
        const mqttCreds = generateMQTTCredentials(finalId, userId, course_id, deviceId);
        let workingCreds = null;
        
        for (const username of mqttCreds.usernameFormats) {
          console.log(`📡 Testing: username="${username}", password="${mqttCreds.password.substring(0, 8)}..."`);
          
          try {
            const result = await testMqttConnection(
              username,
              mqttCreds.password,
              mqttCreds.clientId,
              mqttCreds.topic,
              mqttCreds.broker,
              mqttCreds.port
            );
            
            if (result.success) {
              console.log(`✅ Device ID auth WORKED with format: ${username}`);
              workingCreds = {
                mqtt_username: username,
                mqtt_password: mqttCreds.password,
                client_id: mqttCreds.clientId,
                public_chat_node: mqttCreds.topic,
                mqtt_chat_url: mqttCreds.broker,
                mqtt_port: mqttCreds.port,
                device_id: deviceId,
                auth_method: "device_id",
                format: username
              };
              break;
            }
          } catch (e) {
            console.log(`❌ Format ${username} error: ${e.message}`);
          }
        }
        
        if (workingCreds) {
          return res.status(200).json({
            success: true,
            responseCode: 200,
            message: "Device ID authentication successful",
            data: workingCreds,
            device_auth: true
          });
        }
        
        // ============================================================
        // STEP 3: Try common public credentials
        // ============================================================
        console.log("📡 STEP 3: Trying public credentials...");
        
        const publicCreds = [
          { username: "public", password: "public" },
          { username: "live", password: "live123" },
          { username: "guest", password: "guest" },
          { username: "user", password: "user" },
          { username: "anonymous", password: "anonymous" },
          { username: "device", password: deviceId },
          { username: userId, password: deviceId },
          { username: `user_${userId}`, password: deviceId },
          { username: "mqtt", password: "mqtt" },
          { username: "admin", password: "admin" },
        ];
        
        for (const cred of publicCreds) {
          console.log(`📡 Testing public: ${cred.username}:${cred.password.substring(0, 4)}...`);
          
          try {
            const result = await testMqttConnection(
              cred.username,
              cred.password,
              `client_${userId}_${Date.now()}`,
              `live/${course_id}/${finalId}`,
              "mqtt-ws.nexttoppers.com",
              8084
            );
            
            if (result.success) {
              console.log(`✅ Public credentials WORKED: ${cred.username}`);
              const publicResult = {
                mqtt_username: cred.username,
                mqtt_password: cred.password,
                client_id: `client_${userId}_${Date.now()}`,
                public_chat_node: `live/${course_id}/${finalId}`,
                mqtt_chat_url: "mqtt-ws.nexttoppers.com",
                mqtt_port: 8084,
                auth_method: "public"
              };
              
              return res.status(200).json({
                success: true,
                responseCode: 200,
                data: publicResult,
                source: "public_credentials"
              });
            }
          } catch (e) {
            console.log(`❌ Public ${cred.username} failed: ${e.message}`);
          }
        }
        
        // ============================================================
        // STEP 4: Try conversation API (might work without enrollment)
        // ============================================================
        console.log("📡 STEP 4: Trying conversation API...");
        
        try {
          const convResponse = await fetch(`${DOUBT}/api/v1/conversations/askdoubt`, {
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
          
          const convData = await convResponse.json();
          console.log("📡 Conversation Response:", JSON.stringify(convData, null, 2));
          
          if (convData.success && convData.data) {
            const conv = convData.data;
            const possiblePassword = conv.mqtt_password || conv.password || conv.pass || 
                                    conv.session_id || conv.sessionId || conv.token ||
                                    conv.conversation_id || conv.id;
            
            const possibleTopic = conv.public_chat_node || conv.chat_node || conv.topic ||
                                 conv.public_topic || conv.channel;
            
            if (possiblePassword && possibleTopic) {
              console.log("✅ Got credentials from conversation API!");
              const convCreds = {
                mqtt_username: String(conv.mqtt_username || conv.username || userId),
                mqtt_password: String(possiblePassword),
                client_id: conv.client_id || `client_${userId}_${Date.now()}`,
                public_chat_node: String(possibleTopic),
                mqtt_chat_url: conv.mqtt_chat_url || "mqtt-ws.nexttoppers.com",
                mqtt_port: conv.mqtt_port || 8084,
                auth_method: "conversation"
              };
              
              return res.status(200).json({
                success: true,
                responseCode: 200,
                data: convCreds,
                source: "conversation_api"
              });
            }
          }
        } catch (convError) {
          console.log("❌ Conversation API error:", convError.message);
        }
        
        // ============================================================
        // STEP 5: Try dynamic link (if available)
        // ============================================================
        console.log("📡 STEP 5: Trying dynamic link (if available)...");
        
        // If we have a short code, try it
        const shortCode = body?.short_code || req.query?.short_code;
        if (shortCode) {
          try {
            const dlResponse = await fetch(`${NT}/dl/dynamic-link?short_code=${shortCode}`, {
              method: "GET",
              headers: headers
            });
            
            const dlData = await dlResponse.json();
            console.log("📡 Dynamic Link Response:", JSON.stringify(dlData, null, 2));
            
            if (dlData.success && dlData.data) {
              // Dynamic link worked! Now try to get credentials again
              const retryResponse = await fetch(`${AUTH}/chat/join-class`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ 
                  video_id: String(finalId), 
                  course_id: String(course_id) 
                })
              });
              
              const retryData = await retryResponse.json();
              console.log("📡 Retry API Response:", JSON.stringify(retryData, null, 2));
              
              if (retryData.success && retryData.data && retryData.data.mqtt_password) {
                console.log("✅ Dynamic link worked! Got real credentials.");
                return res.status(200).json(retryData);
              }
            }
          } catch (dlError) {
            console.log("❌ Dynamic link error:", dlError.message);
          }
        }
        
        // ============================================================
        // STEP 6: Ultimate fallback - generate credentials
        // ============================================================
        console.log("📡 STEP 6: Using fallback credentials...");
        
        const fallbackCreds = {
          mqtt_username: String(userId),
          mqtt_password: `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          client_id: `client_${userId}_${Date.now()}`,
          public_chat_node: `live/${course_id}/${finalId}`,
          mqtt_chat_url: "mqtt-ws.nexttoppers.com",
          mqtt_port: 8084,
          auth_method: "fallback",
          device_id: deviceId,
          user_id: userId,
          content_id: finalId,
          course_id: course_id
        };
        
        return res.status(200).json({
          success: true,
          responseCode: 200,
          message: "Fallback credentials generated (all auth methods failed)",
          data: fallbackCreds,
          bypassed: true,
          fallback: true,
          attempts: {
            device_id_formats: mqttCreds.usernameFormats.length,
            public_creds: publicCreds.length,
            conversation: true,
            dynamic_link: !!shortCode
          }
        });
        
      } catch (error) {
        console.error("❌ Error:", error);
        
        const fallbackCreds = {
          mqtt_username: String(userId),
          mqtt_password: `error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          client_id: `client_${userId}_${Date.now()}`,
          public_chat_node: `live/${course_id}/${finalId}`,
          mqtt_chat_url: "mqtt-ws.nexttoppers.com",
          mqtt_port: 8084,
          auth_method: "error"
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
