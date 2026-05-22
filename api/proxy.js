// ============================================================
// COMPLETE PROXY - Mission JEET / Delta Study
// With Auto-Refresh, Player, PDF Viewer, Grouping
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const APP_ID      = "1772100600";
const USER_COURSE = "3186295";
const USER_TEST   = "4071072";
const DEVICE_ID   = "ae2fa506-85ca-418d-a449-ec5868dc6665";

// Fallback token (will be replaced by user's own token)
const FALLBACK = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjMwNTYxLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1ODY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3NzkzNzM5MTMsImV4cCI6MTc4MTk2NTkxM30.a9aCx3uzCS0W69KsiD_m4vwX11znneFvIn7JKSSPjQU";

// Token cache (in-memory, for serverless consider Redis)
const tokenCache = new Map();

// ============================================================
// HELPER FUNCTIONS
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

async function getValidToken(userToken, refreshToken, sessionId) {
  if (userToken && !isTokenExpired(userToken)) {
    return `Bearer ${userToken}`;
  }
  
  if (sessionId && tokenCache.has(sessionId)) {
    const cached = tokenCache.get(sessionId);
    if (!isTokenExpired(cached.accessToken)) {
      return cached.accessToken;
    }
  }
  
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${AUTH}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken })
      });
      
      const refreshData = await refreshRes.json();
      const newAccessToken = refreshData.accessToken || refreshData.data?.accessToken;
      
      if (newAccessToken) {
        const bearerToken = `Bearer ${newAccessToken}`;
        if (sessionId) {
          tokenCache.set(sessionId, {
            accessToken: bearerToken,
            refreshToken: refreshToken,
            expiry: getTokenExpiry(newAccessToken)
          });
        }
        return bearerToken;
      }
    } catch(e) {
      console.error("Auto-refresh failed:", e.message);
    }
  }
  
  return userToken ? `Bearer ${userToken}` : FALLBACK;
}

function getUserId(tok) {
  try {
    if (!tok) return USER_COURSE;
    const payload = JSON.parse(Buffer.from(tok.split('.')[1], 'base64').toString());
    return String(payload.user_id || USER_COURSE);
  } catch(e) { return USER_COURSE; }
}

function buildHeaders(token) {
  const uid = getUserId(token ? token.replace("Bearer ", "") : null);
  return {
    "accept": "application/json, text/plain, */*",
    "app_id": APP_ID,
    "authorization": token || FALLBACK,
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "referer": "https://missionjeet.in/",
    "platform": "3",
    "version": "1",
    "user_id": uid,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "app_id": APP_ID,
    "platform": "3",
    "version": "1",
    "origin": "https://missionjeet.in"
  };
}

// ============================================================
// PLAYER HTML TEMPLATES
// ============================================================

function getHLSPlayerHTML(videoUrl) {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Mission JEET - Video Player</title>
    <link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet">
    <script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        body { margin: 0; background: #000; font-family: system-ui, sans-serif; }
        .video-js { width: 100%; height: 100vh; }
        .error-msg { color: #ff4444; text-align: center; padding: 20px; }
    </style>
</head>
<body>
    <video id="player" class="video-js vjs-default-skin vjs-big-play-centered" controls>
        <p class="vjs-no-js">Please enable JavaScript to view this video.</p>
    </video>
    <script>
        const videoUrl = "${videoUrl}";
        const player = videojs('player');
        
        if (Hls.isSupported()) {
            const hls = new Hls({ debug: false, enableWorker: true });
            hls.loadSource(videoUrl);
            hls.attachMedia(player.tech_.el_);
            hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
                document.body.innerHTML = '<div class="error-msg">Failed to load video. Please try again later.</div>';
            });
        } else if (player.tech_.el_.canPlayType('application/vnd.apple.mpegurl')) {
            player.tech_.el_.src = videoUrl;
            player.tech_.el_.addEventListener('loadedmetadata', () => player.play());
        } else {
            document.body.innerHTML = '<div class="error-msg">HLS not supported in this browser.</div>';
        }
    </script>
</body>
</html>`;
}

function getPDFViewerHTML(pdfUrl) {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Mission JEET - PDF Viewer</title>
    <style>
        body { margin: 0; height: 100vh; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
    </style>
</head>
<body>
    <iframe src="${pdfUrl}"></iframe>
</body>
</html>`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-User-Token,X-Refresh-Token,X-Session-Id");
  if (req.method === "OPTIONS") return res.status(200).end();

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }
  body = Object.assign({}, req.query, body);

  const { action } = req.query;
  const userToken = req.headers["x-user-token"] || null;
  const refreshTokenHeader = req.headers["x-refresh-token"] || null;
  const sessionId = req.headers["x-session-id"] || null;

  try {

    // ============================================================
    // 1. SEND OTP
    // ============================================================
    if (action === "sendotp") {
      const { mobile } = body;
      if (!mobile) {
        return res.status(400).json({ success: false, error: "mobile required" });
      }
      
      const response = await fetch(`${AUTH}/auth/check-user`, {
        method: "POST",
        headers: authHeaders(),
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
    // 2. VERIFY OTP (Returns Access + Refresh Tokens)
    // ============================================================
    if (action === "verifyotp") {
      const { mobile, otp, name } = body;
      if (!mobile || !otp) {
        return res.status(400).json({ success: false, error: "mobile and otp required" });
      }
      
      const response = await fetch(`${AUTH}/auth/verify-otp`, {
        method: "POST",
        headers: authHeaders(),
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
      
      if (accessToken && refreshToken) {
        const newSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        tokenCache.set(newSessionId, {
          accessToken: `Bearer ${accessToken}`,
          refreshToken: refreshToken,
          expiry: getTokenExpiry(accessToken)
        });
        
        return res.status(200).json({
          success: true,
          accessToken: accessToken,
          refreshToken: refreshToken,
          sessionId: newSessionId,
          expiresIn: getTokenExpiry(accessToken)
        });
      }
      
      return res.status(200).json(data);
    }

    // ============================================================
    // 3. REFRESH TOKEN (Auto-refresh endpoint)
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
      
      try {
        const refreshRes = await fetch(`${AUTH}/auth/refresh-token`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ refreshToken: tokenToRefresh })
        });
        
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.accessToken || refreshData.data?.accessToken;
        
        if (newAccessToken) {
          if (sessionId && tokenCache.has(sessionId)) {
            const cached = tokenCache.get(sessionId);
            tokenCache.set(sessionId, {
              accessToken: `Bearer ${newAccessToken}`,
              refreshToken: cached.refreshToken,
              expiry: getTokenExpiry(newAccessToken)
            });
          }
          
          return res.json({
            success: true,
            accessToken: newAccessToken,
            expiresIn: getTokenExpiry(newAccessToken)
          });
        } else {
          return res.status(401).json({
            success: false,
            error: "Refresh token expired, please login again"
          });
        }
      } catch(err) {
        return res.status(500).json({
          success: false,
          error: "Refresh failed: " + err.message
        });
      }
    }

    // ============================================================
    // 4. COURSE DETAILS
    // ============================================================
    if (action === "course") {
      const { course_id, parent_id } = req.query;
      if (!course_id) {
        return res.status(400).json({ error: "course_id required" });
      }
      
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const response = await fetch(`${NT}/course/course-details`, {
        method: "POST",
        headers: buildHeaders(validToken),
        body: JSON.stringify({
          course_id: String(course_id),
          parent_id: String(parent_id || "0")
        })
      });
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ============================================================
    // 5. COURSE CONTENT (with grouping)
    // ============================================================
    if (action === "content") {
      const { course_id, folder_id, parent_course_id } = req.query;
      if (!course_id) {
        return res.status(400).json({ error: "course_id required" });
      }
      
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const response = await fetch(`${NT}/course/all-content`, {
        method: "POST",
        headers: buildHeaders(validToken),
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
      
      // Group content by title (video + PDF together)
      if (data.success && data.data && Array.isArray(data.data)) {
        const groupedMap = new Map();
        for (const item of data.data) {
          const title = item.title;
          if (!groupedMap.has(title)) {
            groupedMap.set(title, { 
              title: title, 
              video: null, 
              pdf: null, 
              other: [],
              entity_id: item.entity_id
            });
          }
          const group = groupedMap.get(title);
          if (item.data?.file_type === 2) {
            group.video = item;
          } else if (item.data?.file_type === 1) {
            group.pdf = item;
          } else {
            group.other.push(item);
          }
        }
        data.grouped = Array.from(groupedMap.values());
      }
      
      return res.status(200).json(data);
    }

    // ============================================================
    // 6. VIDEO / CONTENT DETAILS (with player URLs)
    // ============================================================
    if (action === "video") {
      const { content_id, course_id } = req.query;
      if (!content_id || !course_id) {
        return res.status(400).json({ error: "content_id and course_id required" });
      }
      
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      const response = await fetch(
        `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
        { method: "GET", headers: buildHeaders(validToken) }
      );
      
      const data = await response.json();
      
      // Add player URLs for convenience
      if (data.success && data.data) {
        const content = data.data;
        
        if (content.file_url) {
          if (content.file_url.includes('.m3u8')) {
            content.playerUrl = `/api/proxy?action=player&url=${encodeURIComponent(content.file_url)}`;
            content.playerType = "hls";
          } else if (content.file_type === 1) {
            content.playerUrl = `/api/proxy?action=pdf&url=${encodeURIComponent(content.file_url)}`;
            content.playerType = "pdf";
          } else if (content.file_url.match(/\.(mp4|mov|mkv)$/i)) {
            content.playerUrl = content.file_url;
            content.playerType = "mp4";
          }
        } else if (content.vdc_id) {
          content.playerUrl = `https://play.vdocipher.com/v2/${content.vdc_id}`;
          content.playerType = "vdocipher";
        }
        
        // Parse download_urls if present
        if (content.download_urls && typeof content.download_urls === 'string') {
          try {
            content.downloadUrls = JSON.parse(content.download_urls);
          } catch(e) {}
        }
      }
      
      return res.status(200).json(data);
    }

    // ============================================================
    // 7. HLS PLAYER PAGE
    // ============================================================
    if (action === "player") {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "url parameter required" });
      }
      
      const decodedUrl = decodeURIComponent(url);
      res.setHeader('Content-Type', 'text/html');
      return res.send(getHLSPlayerHTML(decodedUrl));
    }

    // ============================================================
    // 8. PDF VIEWER PAGE
    // ============================================================
    if (action === "pdf") {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "url parameter required" });
      }
      
      const decodedUrl = decodeURIComponent(url);
      res.setHeader('Content-Type', 'text/html');
      return res.send(getPDFViewerHTML(decodedUrl));
    }

    // ============================================================
    // 9. LIVE CLASSES
    // ============================================================
    if (action === "live") {
      const { course_id } = req.query;
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      
      const response = await fetch(`${NT}/course/all-content`, {
        method: "POST",
        headers: buildHeaders(validToken),
        body: JSON.stringify({
          course_id: String(course_id || "152"),
          folder_id: "0",
          is_free: "",
          keyword: "",
          limit: "100",
          page: "1",
          parent_course_id: "0"
        })
      });
      
      const data = await response.json();
      
      // Filter live classes: file_type=2, video_type=3, is_live=1
      const lives = (data.data || []).filter(item =>
        item.data?.is_live === 1 ||
        (item.data?.file_type === 2 && item.data?.video_type === 3 && item.data?.is_live === 1)
      );
      
      return res.status(200).json({ ...data, data: lives });
    }

    // ============================================================
    // 10. UPCOMING CLASSES
    // ============================================================
    if (action === "upcoming") {
      const { course_id } = req.query;
      const validToken = await getValidToken(userToken, refreshTokenHeader, sessionId);
      
      const response = await fetch(`${NT}/course/all-content`, {
        method: "POST",
        headers: buildHeaders(validToken),
        body: JSON.stringify({
          course_id: String(course_id || "152"),
          folder_id: "0",
          is_free: "",
          keyword: "",
          limit: "100",
          page: "1",
          parent_course_id: "0"
        })
      });
      
      const data = await response.json();
      const now = Math.floor(Date.now() / 1000);
      
      const upcoming = (data.data || []).filter(item =>
        item.data?.is_upcoming === 1 ||
        (item.data?.start_time && Number(item.data.start_time) > now && item.data?.is_live !== 1)
      );
      
      return res.status(200).json({ ...data, data: upcoming });
    }

    // ============================================================
    // 11. TEST INSTRUCTIONS
    // ============================================================
    if (action === "testinfo") {
      const { test_id } = req.query;
      if (!test_id) {
        return res.status(400).json({ error: "test_id required" });
      }
      
      const response = await fetch(
        `${TEST}/test/get-test-instructions?test_id=${test_id}`,
        { method: "GET", headers: buildHeaders(FALLBACK) }
      );
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ============================================================
    // 12. TEST DATA
    // ============================================================
    if (action === "testdata") {
      const { test_id } = req.query;
      if (!test_id) {
        return res.status(400).json({ error: "test_id required" });
      }
      
      const response = await fetch(
        `${TEST}/test/get-test-data?test_id=${test_id}`,
        { method: "GET", headers: buildHeaders(FALLBACK) }
      );
      
      const data = await response.json();
      return res.status(200).json(data);
    }

    // ============================================================
    // DEFAULT: Invalid action
    // ============================================================
    return res.status(400).json({
      success: false,
      error: "Invalid action",
      available: [
        "sendotp", "verifyotp", "refresh",
        "course", "content", "video", 
        "player", "pdf", "live", "upcoming",
        "testinfo", "testdata"
      ]
    });

  } catch (err) {
    console.error("Proxy Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};
