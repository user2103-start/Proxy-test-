// ============================================================
// api/proxy.js - SIMPLE PROXY (No Live Detection)
// Mission JEET - Pure Proxy Only
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const APP_ID      = "1772100600";
const USER_COURSE = "3186295";
const USER_TEST   = "4071072";
const DEVICE_ID   = "ae2fa506-85ca-418d-a449-ec5868dc6665";

const FALLBACK = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjMwNTYxLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1ODY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzk1MjU5NDksImV4cCI6MTc4MjExNzk0OX0.af5TsnO-r0HK2aKTEDndebtdeyyTSEhx00vnNLcD9sE";

// Simple rate limiting
const requestCounts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimit = requestCounts.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (userLimit.count >= 100) return false;
  userLimit.count++;
  return true;
}

// ============================================================
// TOKEN FUNCTIONS
// ============================================================

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
    const expiry = payload.exp * 1000;
    return Date.now() >= (expiry - 5 * 60 * 1000);
  } catch(e) {
    return true;
  }
}

function getTokenExpiry(token) {
  try {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
    return payload.exp * 1000;
  } catch(e) {
    return Date.now() + 30 * 24 * 60 * 60 * 1000;
  }
}

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

async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch(`${AUTH}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshToken })
    });
    
    const data = await response.json();
    const newAccessToken = data.accessToken || data.data?.accessToken;
    
    if (newAccessToken) {
      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn: getTokenExpiry(newAccessToken)
      };
    }
    return { success: false, error: "Refresh failed" };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function buildHeaders(accessToken, userId) {
  return {
    "accept": "application/json, text/plain, */*",
    "app_id": APP_ID,
    "authorization": accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "referer": "https://missionjeet.in/",
    "platform": "3",
    "version": "1",
    "user_id": userId,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };
}

function buildAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "app_id": APP_ID,
    "platform": "3",
    "version": "1",
    "origin": "https://missionjeet.in"
  };
}

// ============================================================
// PDF VIEWER ONLY
// ============================================================

function getPDFViewerHTML(pdfUrl) {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mission JEET - PDF Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f0f0f0; height: 100vh; overflow: hidden; font-family: system-ui, sans-serif; }
        iframe { width: 100%; height: 100%; border: none; }
        .download-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a1a2e;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-family: system-ui;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            font-weight: 500;
        }
        .download-btn:hover { background: #2d2d44; }
        .back-btn {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #1a1a2e;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-family: system-ui;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .back-btn:hover { background: #2d2d44; }
    </style>
</head>
<body>
    <iframe src="${pdfUrl}" title="PDF Viewer"></iframe>
    <a href="${pdfUrl}" class="download-btn" download>📥 Download PDF</a>
    <a href="javascript:history.back()" class="back-btn">← Back</a>
</body>
</html>`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Refresh-Token");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  
  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ 
      success: false, 
      error: "Too many requests. Please wait a minute." 
    });
  }

  // Parse request body
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }
  body = Object.assign({}, req.query, body);

  const { action } = req.query;
  const userToken = req.headers["authorization"] || null;
  const refreshTokenHeader = req.headers["x-refresh-token"] || null;

  try {
    // ============================================================
    // ACTION: sendotp
    // ============================================================
    if (action === "sendotp") {
      const { mobile } = body;
      if (!mobile) {
        return res.status(400).json({ success: false, error: "mobile required" });
      }
      
      const response = await fetch(`${AUTH}/auth/check-user`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          mobile: String(mobile),
          device_id: DEVICE_ID,
          mobile_otp_login: 1,
          otp: ""
        })
      });
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ============================================================
    // ACTION: verifyotp
    // ============================================================
    if (action === "verifyotp") {
      const { mobile, otp, name } = body;
      if (!mobile || !otp) {
        return res.status(400).json({ success: false, error: "mobile and otp required" });
      }
      
      const response = await fetch(`${AUTH}/auth/verify-otp`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          mobile: String(mobile),
          otp: String(otp),
          signup_needed: "0",
          device_id: DEVICE_ID,
          ...(name ? { name } : {})
        })
      });
      
      const data = await response.json();
      const accessToken = data.data?.accessToken || data.accessToken;
      const refreshToken = data.data?.refreshToken || data.refreshToken;
      const userId = data.data?.user_id || getUserIdFromToken(accessToken);
      
      if (accessToken && refreshToken) {
        return res.status(200).json({
          success: true,
          userId: userId,
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresIn: getTokenExpiry(accessToken)
        });
      }
      
      return res.status(200).json(data);
    }

    // ============================================================
    // ACTION: refresh
    // ============================================================
    if (action === "refresh") {
      const { refreshToken } = body;
      const tokenToRefresh = refreshToken || refreshTokenHeader;
      
      if (!tokenToRefresh) {
        return res.status(400).json({ 
          success: false, 
          error: "Refresh token required" 
        });
      }
      
      const result = await refreshAccessToken(tokenToRefresh);
      return res.status(result.success ? 200 : 401).json(result);
    }

    // ============================================================
    // ACTION: course
    // ============================================================
    if (action === "course") {
      const { course_id, parent_id } = req.query;
      if (!course_id) {
        return res.status(400).json({ error: "course_id required" });
      }
      
      let accessToken = userToken;
      let userId = getUserIdFromToken(accessToken);
      
      if (accessToken && isTokenExpired(accessToken)) {
        if (refreshTokenHeader) {
          const refreshResult = await refreshAccessToken(refreshTokenHeader);
          if (refreshResult.success) {
            accessToken = `Bearer ${refreshResult.accessToken}`;
          }
        }
      }
      
      const finalToken = accessToken || FALLBACK;
      const response = await fetch(`${NT}/course/course-details`, {
        method: "POST",
        headers: buildHeaders(finalToken, userId),
        body: JSON.stringify({
          course_id: String(course_id),
          parent_id: String(parent_id || "0")
        })
      });
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ============================================================
    // ACTION: content - Returns RAW data, frontend will filter
    // ============================================================
    if (action === "content") {
      const { course_id, folder_id, parent_course_id } = req.query;
      if (!course_id) {
        return res.status(400).json({ error: "course_id required" });
      }
      
      let accessToken = userToken;
      let userId = getUserIdFromToken(accessToken);
      
      if (accessToken && isTokenExpired(accessToken)) {
        if (refreshTokenHeader) {
          const refreshResult = await refreshAccessToken(refreshTokenHeader);
          if (refreshResult.success) {
            accessToken = `Bearer ${refreshResult.accessToken}`;
          }
        }
      }
      
      const finalToken = accessToken || FALLBACK;
      const response = await fetch(`${NT}/course/all-content`, {
        method: "POST",
        headers: buildHeaders(finalToken, userId),
        body: JSON.stringify({
          course_id: String(course_id),
          folder_id: String(folder_id || "0"),
          is_free: "",
          keyword: "",
          limit: "1000",
          page: "1",
          parent_course_id: String(parent_course_id || "0")
        })
      });
      
      const data = await response.json();
      
      // Only grouping, NO live/upcoming filtering
      if (data.success && data.data && Array.isArray(data.data)) {
        const groupedMap = new Map();
        for (const item of data.data) {
          const title = item.title;
          if (!groupedMap.has(title)) {
            groupedMap.set(title, { title, video: null, pdf: null, other: [] });
          }
          const group = groupedMap.get(title);
          if (item.data?.file_type === 2) group.video = item;
          else if (item.data?.file_type === 1) group.pdf = item;
          else group.other.push(item);
        }
        data.grouped = Array.from(groupedMap.values());
      }
      
      return res.status(200).json(data);
    }

    // ============================================================
    // ACTION: video - Get direct video URL
    // ============================================================
    if (action === "video") {
      const { content_id, course_id } = req.query;
      if (!content_id || !course_id) {
        return res.status(400).json({ error: "content_id and course_id required" });
      }
      
      let accessToken = userToken;
      let userId = getUserIdFromToken(accessToken);
      
      if (accessToken && isTokenExpired(accessToken)) {
        if (refreshTokenHeader) {
          const refreshResult = await refreshAccessToken(refreshTokenHeader);
          if (refreshResult.success) {
            accessToken = `Bearer ${refreshResult.accessToken}`;
          }
        }
      }
      
      const finalToken = accessToken || FALLBACK;
      const response = await fetch(
        `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
        { method: "GET", headers: buildHeaders(finalToken, userId) }
      );
      
      const data = await response.json();
      
      // Add direct URLs
      if (data.success && data.data) {
        const content = data.data;
        
        if (content.file_url) {
          content.directUrl = content.file_url;
          content.playerType = content.file_type === 1 ? "pdf" : "video";
          
          if (content.file_type === 1) {
            content.viewerUrl = `/api/proxy?action=pdf&url=${encodeURIComponent(content.file_url)}`;
          }
        }
        
        if (content.download_urls && typeof content.download_urls === 'string') {
          try {
            content.parsedDownloadUrls = JSON.parse(content.download_urls);
          } catch(e) {}
        }
      }
      
      return res.status(200).json(data);
    }

    // ============================================================
    // ACTION: pdf
    // ============================================================
    if (action === "pdf") {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "url parameter required" });
      }
      
      const decodedUrl = decodeURIComponent(url);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(getPDFViewerHTML(decodedUrl));
    }

    // ============================================================
    // ACTION: testinfo
    // ============================================================
    if (action === "testinfo") {
      const { test_id } = req.query;
      if (!test_id) {
        return res.status(400).json({ error: "test_id required" });
      }
      
      const response = await fetch(
        `${TEST}/test/get-test-instructions?test_id=${test_id}`,
        { method: "GET", headers: buildHeaders(FALLBACK, USER_TEST) }
      );
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ============================================================
    // ACTION: testdata
    // ============================================================
    if (action === "testdata") {
      const { test_id } = req.query;
      if (!test_id) {
        return res.status(400).json({ error: "test_id required" });
      }
      
      const response = await fetch(
        `${TEST}/test/get-test-data?test_id=${test_id}`,
        { method: "GET", headers: buildHeaders(FALLBACK, USER_TEST) }
      );
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ============================================================
    // ACTION: stats
    // ============================================================
    if (action === "stats") {
      return res.status(200).json({
        success: true,
        status: "healthy",
        activeRateLimitEntries: requestCounts.size,
        timestamp: Date.now(),
        note: "Proxy only - Live/Upcoming detection moved to frontend"
      });
    }

    // ============================================================
    // Default
    // ============================================================
    return res.status(400).json({
      success: false,
      error: "Invalid action",
      available: [
        "sendotp", "verifyotp", "refresh",
        "course", "content", "video", 
        "pdf", "testinfo", "testdata", "stats"
      ]
    });

  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error" 
    });
  }
};
