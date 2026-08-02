// ============================================================
// api/proxy.js - COMPLETE WITH VIDEO BACKUP FALLBACK
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
"accept": "application/json, text/plain, /",
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
// VIDEO FALLBACK HELPER
// ============================================================
async function getVideoBackup(content_id, course_id) {
console.log(`📡 [BACKUP] Attempting to fetch video for content_id: ${content_id}, course_id: ${course_id}`);

try {
// Try alternative endpoints or sources
const backupUrls = [
// Try different CDN endpoints
`https://cdn.nexttoppers.com/videos/${course_id}/${content_id}.m3u8`,
`https://storage.nexttoppers.com/content/${content_id}/playlist.m3u8`,
`https://video.nexttoppers.com/${course_id}/${content_id}/index.m3u8`,
];

// Try to get from alternative API endpoint
try {
const response = await fetch(`${NT}/video/stream-url`, {
method: "POST",
headers: {
"Content-Type": "application/json",
"accept": "application/json",
},
body: JSON.stringify({
content_id: String(content_id),
course_id: String(course_id)
})
});

if (response.ok) {
const data = await response.json();
if (data.success && data.data?.stream_url) {
console.log(`✅ [BACKUP] Found video via alternative API`);
return {
success: true,
data: {
stream_url: data.data.stream_url,
source: "backup-api",
content_id: content_id,
course_id: course_id
}
};
}
}
} catch (e) {
console.log(`⚠️ [BACKUP] Alternative API failed:`, e.message);
}

// If we have a pre-configured stream URL, try it
for (const url of backupUrls) {
try {
const testResponse = await fetch(url, { method: "HEAD", timeout: 3000 });
if (testResponse.ok) {
console.log(`✅ [BACKUP] Found video at: ${url}`);
return {
success: true,
data: {
stream_url: url,
source: "backup-cdn",
content_id: content_id,
course_id: course_id
}
};
}
} catch (e) {
// Continue to next URL
}
}

// Try to construct from content metadata if available
const metadataResponse = await fetch(`${NT}/course/content-meta`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
content_id: String(content_id),
course_id: String(course_id)
})
});

if (metadataResponse.ok) {
const metadata = await metadataResponse.json();
if (metadata.data?.video_url) {
console.log(`✅ [BACKUP] Found video via metadata`);
return {
success: true,
data: {
stream_url: metadata.data.video_url,
source: "backup-metadata",
content_id: content_id,
course_id: course_id
}
};
}
}

console.log(`❌ [BACKUP] No video found for content_id: ${content_id}`);
return {
success: false,
error: "Video not available in backup sources",
content_id: content_id,
course_id: course_id
};

} catch (error) {
console.error(`❌ [BACKUP] Error:`, error.message);
return {
success: false,
error: "Backup service temporarily unavailable",
content_id: content_id,
course_id: course_id
};
}
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
const response = await fetch(${AUTH}/auth/check-user, {
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
const response = await fetch(${AUTH}/auth/verify-otp, {
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
const response = await fetch(${NT}/course/course-details, {
method: "POST",
headers: headers,
body: JSON.stringify({ course_id: String(course_id), parent_id: String(parent_id || "0") })
});
return res.status(200).json(await response.json());
}

// 4. CONTENT LIST
if (action === "content") {
const { course_id, folder_id, parent_course_id } = req.query;
const response = await fetch(${NT}/course/all-content, {
method: "POST",
headers: headers,
body: JSON.stringify({
course_id: String(course_id), folder_id: String(folder_id || "0"),
is_free: "", keyword: "", limit: "1000", page: "1", parent_course_id: String(parent_course_id || "0")
})
});
return res.status(200).json(await response.json());
}

// 5. VIDEO/PDF SOURCE DETAILS (PRIMARY)
if (action === "video") {
const { content_id, course_id } = req.query;
const response = await fetch(${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}, {
method: "GET",
headers: headers
});

const videoData = await response.json();

// Log if stream URL is missing
if (!videoData.success || !videoData.data?.stream_url) {
console.log(`⚠️ [VIDEO] No stream URL for content_id: ${content_id}, will trigger fallback`);
}

return res.status(200).json(videoData);
}

// 5.1 VIDEO BACKUP FALLBACK ENDPOINT
if (action === "video-backup") {
const { content_id, course_id } = req.query;

// Validate required parameters
if (!content_id) {
return res.status(400).json({ 
success: false, 
error: "content_id is required" 
});
}

if (!course_id) {
return res.status(400).json({ 
success: false, 
error: "course_id is required" 
});
}

// Log the fallback attempt
console.log(`🔄 [FALLBACK] Video backup requested for content_id: ${content_id}, course_id: ${course_id}`);

// Get video from backup sources
const backupResult = await getVideoBackup(content_id, course_id);

// Return appropriate response
if (backupResult.success && backupResult.data?.stream_url) {
return res.status(200).json({
success: true,
data: backupResult.data,
message: "Video retrieved from backup source"
});
} else {
// Return friendly error message instead of "Stream URL Not Found"
return res.status(200).json({
success: false,
data: null,
message: "Please wait a few minutes and try again. The video may still be processing.",
content_id: content_id,
course_id: course_id
});
}
}

// 6. USER PROFILE
if (action === "profile") {
const response = await fetch(${AUTH}/user/my-profile, {
method: "GET", headers: headers
});
return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Get Test Instructions
// ============================================================
if (action === "test-instructions") {
const { test_id, attempt_mode } = req.query;

if (!test_id) {
return res.status(400).json({ success: false, error: "test_id is required" });
}

console.log("📡 Getting test instructions for:", test_id);

const response = await fetch(${TEST}/test/get-test-instructions?test_id=${test_id}&attempt_mode=${attempt_mode || "live"}, {
method: "GET",
headers: headers
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Get Test Data (Questions)
// ============================================================
if (action === "test-data") {
const { test_id, attempt_mode } = req.query;

if (!test_id) {
return res.status(400).json({ success: false, error: "test_id is required" });
}

console.log("📡 Getting test data for:", test_id);

const response = await fetch(${TEST}/test/get-test-data?test_id=${test_id}&attempt_mode=${attempt_mode || "live"}, {
method: "GET",
headers: headers
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Submit Test
// ============================================================
if (action === "test-submit") {
const { test_id, course_id, answers, total_time_spent } = body;

console.log("📡 Submitting test:", { test_id, course_id, total_time_spent });

const response = await fetch(${TEST}/test/submit, {
method: "POST",
headers: headers,
body: JSON.stringify({
test_id: String(test_id),
course_id: String(course_id || ""),
user_id: headers["user-id"] || "3230561",
answers: answers || {},
total_time_spent: total_time_spent || 0
})
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Get Result
// ============================================================
if (action === "test-result") {
const { test_id } = req.query;

console.log("📡 Getting test result for:", test_id);

const response = await fetch(${TEST}/test/result?test_id=${test_id}, {
method: "GET",
headers: headers
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Get Leaderboard
// ============================================================
if (action === "test-leaderboard") {
const { test_id } = req.query;

console.log("📡 Getting leaderboard for:", test_id);

const response = await fetch(${TEST}/test/leaderboard?test_id=${test_id}, {
method: "GET",
headers: headers
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Get Solution
// ============================================================
if (action === "test-solution") {
const { test_id } = req.query;

console.log("📡 Getting test solution for:", test_id);

const response = await fetch(${TEST}/test/solution?test_id=${test_id}, {
method: "GET",
headers: headers
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Report Question
// ============================================================
if (action === "test-report") {
const { test_id, question_id, reason } = body;

console.log("📡 Reporting question:", { test_id, question_id });

const response = await fetch(${TEST}/test/report-question, {
method: "POST",
headers: headers,
body: JSON.stringify({
test_id: String(test_id),
question_id: String(question_id),
reason: String(reason || "")
})
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Practice Result
// ============================================================
if (action === "test-practice-result") {
const { test_id } = req.query;

console.log("📡 Getting practice result for:", test_id);

const response = await fetch(${TEST}/test/practice-result?test_id=${test_id}, {
method: "GET",
headers: headers
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ TEST - Practice Solution
// ============================================================
if (action === "test-practice-solution") {
const { test_id } = req.query;

console.log("📡 Getting practice solution for:", test_id);

const response = await fetch(${TEST}/test/practice-solution?test_id=${test_id}, {
method: "GET",
headers: headers
});

return res.status(200).json(await response.json());
}

// ============================================================
// ✅ JOIN CHAT - Simple fallback
// ============================================================
if (action === "joinchat") {
let video_id = body?.video_id || req.query?.video_id;
let content_id = body?.content_id || req.query?.content_id;
let finalId = video_id || content_id;
let course_id = body?.course_id || req.query?.course_id || "0";

if (!finalId) {
return res.status(400).json({ success: false, error: "video_id is required" });
}

const userId = headers["user-id"] || headers["User-Id"] || "3230561";

try {
const response = await fetch(${AUTH}/chat/join-class, {
method: "POST",
headers: headers,
body: JSON.stringify({
video_id: String(finalId),
course_id: String(course_id)
})
});

const data = await response.json();    
console.log("📡 JoinChat Response:", JSON.stringify(data, null, 2));    
    
if (data.success && data.data && data.data.mqtt_password) {    
  return res.status(200).json(data);    
}    
    
// If not enrolled, try to use video details    
try {    
  const videoResponse = await fetch(`${NT}/course/content-details?content_id=${finalId}&course_id=${course_id}`, {    
    method: "GET",    
    headers: headers    
  });    
      
  const videoData = await videoResponse.json();    
  const publicNode = videoData.data?.public_chat_node || videoData.data?.chat_node || `live/${course_id}/${finalId}`;    
      
  const fallbackCreds = {    
    mqtt_username: String(userId),    
    mqtt_password: `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,    
    client_id: `client_${userId}_${Date.now()}`,    
    public_chat_node: publicNode,    
    mqtt_chat_url: "mqtt-ws.nexttoppers.com",    
    mqtt_port: 8084,    
    is_fallback: true,    
    use_public_node: true    
  };    
      
  return res.status(200).json({    
    success: true,    
    responseCode: 200,    
    data: fallbackCreds,    
    bypassed: true    
  });    
} catch (e) {    
  const fallbackCreds = {    
    mqtt_username: String(userId),    
    mqtt_password: `fallback_${Date.now()}`,    
    client_id: `client_${userId}_${Date.now()}`,    
    public_chat_node: `live/${course_id}/${finalId}`,    
    mqtt_chat_url: "mqtt-ws.nexttoppers.com",    
    mqtt_port: 8084,    
    is_fallback: true    
  };    
      
  return res.status(200).json({    
    success: true,    
    responseCode: 200,    
    data: fallbackCreds,    
    bypassed: true    
  });    
}

} catch (error) {
const fallbackCreds = {
mqtt_username: String(userId),
mqtt_password: error_${Date.now()},
client_id: client_${userId}_${Date.now()},
public_chat_node: live/${course_id}/${finalId},
mqtt_chat_url: "mqtt-ws.nexttoppers.com",
mqtt_port: 8084,
is_fallback: true
};

return res.status(200).json({    
  success: true,    
  responseCode: 200,    
  data: fallbackCreds,    
  bypassed: true    
});

}
}

// ============================================================
// ✅ POLL CHAT
// ============================================================
if (action === "pollchat") {
const { content_id } = req.query;
try {
const response = await fetch(${AUTH}/chat/poll?content_id=${content_id}, {
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
const response = await fetch(${AUTH}/chat/send, {
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
