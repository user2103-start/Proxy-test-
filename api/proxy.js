// ============================================================
// api/proxy.js - UPDATED WITH CORS RESTRICTION
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const APP_ID      = "1772100600";
const DEVICE_ID   = "ae2fa506-85ca-418d-a449-ec5868dc6665";
const DEFAULT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjMwNTYxLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1ODY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzk3MTcyODMsImV4cCI6MTc4MjMwOTI4M30.8GtwQYGKQACNXyz2N_dtrm1YmIeo6f3B81_MXiQf3aU";

// ALLOWED ORIGINS - Sirf ye domains allow honge
const ALLOWED_ORIGINS = [
    "https://proxy-test-three.vercel.app",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5500",
    "https://missionjeet.vercel.app"
];

// Rate limiting
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

// CORS handler
function setCorsHeaders(res, origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
        res.setHeader("Access-Control-Allow-Origin", "https://proxy-test-three.vercel.app");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Refresh-Token, X-User-Id, X-Device-Id");
    res.setHeader("Access-Control-Allow-Credentials", "true");
}

// Get valid token
function getValidToken(userToken) {
    if (userToken && userToken.startsWith('Bearer ')) {
        return userToken;
    }
    if (userToken) {
        return `Bearer ${userToken}`;
    }
    return `Bearer ${DEFAULT_TOKEN}`;
}

// Get user ID from token
function getUserIdFromToken(token) {
    try {
        const cleanToken = token.replace('Bearer ', '');
        const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
        return String(payload.user_id);
    } catch(e) {
        return "3230561";
    }
}

// Build headers
function buildHeaders(token, userId) {
    return {
        "accept": "application/json, text/plain, */*",
        "app_id": APP_ID,
        "authorization": token,
        "content-type": "application/json",
        "origin": "https://missionjeet.in",
        "referer": "https://missionjeet.in/",
        "platform": "3",
        "version": "1",
        "user_id": userId,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
}

// Build auth headers (without token)
function buildAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "app_id": APP_ID,
        "platform": "3",
        "version": "1"
    };
}

// Player HTML
function getPlayerHTML(videoUrl, title) {
    const videoTitle = title || "Video Player";
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mission JEET - ${videoTitle}</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; }
        video { width: 100%; height: 100vh; }
        .controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.7);
            padding: 8px 12px;
            border-radius: 8px;
            display: flex;
            gap: 10px;
            z-index: 100;
        }
        select { padding: 5px 10px; border-radius: 5px; background: #333; color: white; border: none; }
        .back-btn {
            position: fixed;
            top: 20px;
            left: 20px;
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            z-index: 100;
        }
    </style>
</head>
<body>
    <button class="back-btn" onclick="history.back()">← Back</button>
    <video id="video" controls></video>
    <div class="controls">
        <select id="qualitySelect">
            <option value="auto">Auto</option>
        </select>
        <select id="speedSelect">
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1" selected>1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
        </select>
    </div>
    <script>
        const videoUrl = decodeURIComponent("${videoUrl}");
        const video = document.getElementById('video');
        
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                const qualitySelect = document.getElementById('qualitySelect');
                if (data.levels && data.levels.length > 1) {
                    qualitySelect.innerHTML = '<option value="auto">Auto</option>';
                    data.levels.forEach((level, i) => {
                        if (level.height) {
                            const option = document.createElement('option');
                            option.value = i;
                            option.textContent = level.height + 'p';
                            qualitySelect.appendChild(option);
                        }
                    });
                    qualitySelect.onchange = function() {
                        hls.currentLevel = this.value === 'auto' ? -1 : parseInt(this.value);
                    };
                }
                video.play();
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoUrl;
        }
        
        document.getElementById('speedSelect').onchange = function() {
            video.playbackRate = parseFloat(this.value);
        };
    </script>
</body>
</html>`;
}

// PDF Viewer HTML
function getPDFViewerHTML(pdfUrl) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PDF Viewer</title>
    <style>
        * { margin: 0; padding: 0; }
        body { height: 100vh; }
        iframe { width: 100%; height: 100%; border: none; }
        .download-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a1a2e;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-family: system-ui;
        }
    </style>
</head>
<body>
    <iframe src="${pdfUrl}"></iframe>
    <a href="${pdfUrl}" class="download-btn" download>📥 Download PDF</a>
</body>
</html>`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

module.exports = async function handler(req, res) {
    // Get origin
    const origin = req.headers.origin;
    
    // Set CORS headers (only for allowed origins)
    setCorsHeaders(res, origin);
    
    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    
    // Rate limit
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: "Too many requests" });
    }
    
    const { action } = req.query;
    const userToken = req.headers["authorization"] || null;
    
    try {
        // Parse body for POST requests
        let body = {};
        if (req.method === "POST") {
            try {
                body = req.body || {};
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
            } catch(e) {
                body = {};
            }
        }
        
        // ==================== SEND OTP ====================
        if (action === "sendotp") {
            const { mobile } = body;
            if (!mobile) {
                return res.status(400).json({ error: "mobile required" });
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
        
        // ==================== VERIFY OTP ====================
        if (action === "verifyotp") {
            const { mobile, otp } = body;
            if (!mobile || !otp) {
                return res.status(400).json({ error: "mobile and otp required" });
            }
            const response = await fetch(`${AUTH}/auth/verify-otp`, {
                method: "POST",
                headers: buildAuthHeaders(),
                body: JSON.stringify({
                    mobile: String(mobile),
                    otp: String(otp),
                    signup_needed: "0",
                    device_id: DEVICE_ID
                })
            });
            const data = await response.json();
            const accessToken = data.data?.accessToken || data.accessToken;
            const refreshToken = data.data?.refreshToken || data.refreshToken;
            if (accessToken && refreshToken) {
                return res.status(200).json({
                    success: true,
                    accessToken: accessToken,
                    refreshToken: refreshToken
                });
            }
            return res.status(200).json(data);
        }
        
        // ==================== REFRESH ====================
        if (action === "refresh") {
            const { refreshToken } = body;
            if (!refreshToken) {
                return res.status(400).json({ error: "refresh token required" });
            }
            const response = await fetch(`${AUTH}/auth/refresh-token`, {
                method: "POST",
                headers: buildAuthHeaders(),
                body: JSON.stringify({ refreshToken })
            });
            const data = await response.json();
            return res.status(200).json(data);
        }
        
        // ==================== COURSE ====================
        if (action === "course") {
            const { course_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            const token = getValidToken(userToken);
            const userId = getUserIdFromToken(token);
            const response = await fetch(`${NT}/course/course-details`, {
                method: "POST",
                headers: buildHeaders(token, userId),
                body: JSON.stringify({
                    course_id: String(course_id),
                    parent_id: "0"
                })
            });
            const data = await response.json();
            return res.status(200).json(data);
        }
        
        // ==================== CONTENT ====================
        if (action === "content") {
            const { course_id, folder_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            const token = getValidToken(userToken);
            const userId = getUserIdFromToken(token);
            const response = await fetch(`${NT}/course/all-content`, {
                method: "POST",
                headers: buildHeaders(token, userId),
                body: JSON.stringify({
                    course_id: String(course_id),
                    folder_id: String(folder_id || "0"),
                    is_free: "",
                    keyword: "",
                    limit: "1000",
                    page: "1",
                    parent_course_id: "0"
                })
            });
            const data = await response.json();
            return res.status(200).json(data);
        }
        
        // ==================== VIDEO ====================
        if (action === "video") {
            const { content_id, course_id } = req.query;
            if (!content_id || !course_id) {
                return res.status(400).json({ error: "content_id and course_id required" });
            }
            const token = getValidToken(userToken);
            const userId = getUserIdFromToken(token);
            const response = await fetch(
                `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
                { headers: buildHeaders(token, userId) }
            );
            const data = await response.json();
            if (data.success && data.data && data.data.file_url) {
                data.data.playerUrl = `/api/proxy?action=player&url=${encodeURIComponent(data.data.file_url)}&title=${encodeURIComponent(data.data.title || 'Video')}`;
            }
            return res.status(200).json(data);
        }
        
        // ==================== PLAYER ====================
        if (action === "player") {
            const { url, title } = req.query;
            if (!url) {
                return res.status(400).json({ error: "url required" });
            }
            const decodedUrl = decodeURIComponent(url);
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(getPlayerHTML(decodedUrl, title));
        }
        
        // ==================== PDF ====================
        if (action === "pdf") {
            const { url } = req.query;
            if (!url) {
                return res.status(400).json({ error: "url required" });
            }
            const decodedUrl = decodeURIComponent(url);
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(getPDFViewerHTML(decodedUrl));
        }
        
        // ==================== LIVE ====================
        if (action === "live") {
            const { course_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            const token = getValidToken(userToken);
            const userId = getUserIdFromToken(token);
            const response = await fetch(`${NT}/course/all-content`, {
                method: "POST",
                headers: buildHeaders(token, userId),
                body: JSON.stringify({
                    course_id: String(course_id),
                    folder_id: "0",
                    is_free: "",
                    keyword: "",
                    limit: "100",
                    page: "1",
                    parent_course_id: "0"
                })
            });
            const data = await response.json();
            if (data.success && data.data) {
                data.live = data.data.filter(item => 
                    item.data?.is_live === 1
                );
            }
            return res.status(200).json(data);
        }
        
        // ==================== UPCOMING ====================
        if (action === "upcoming") {
            const { course_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            const token = getValidToken(userToken);
            const userId = getUserIdFromToken(token);
            const response = await fetch(`${NT}/course/all-content`, {
                method: "POST",
                headers: buildHeaders(token, userId),
                body: JSON.stringify({
                    course_id: String(course_id),
                    folder_id: "0",
                    is_free: "",
                    keyword: "",
                    limit: "100",
                    page: "1",
                    parent_course_id: "0"
                })
            });
            const data = await response.json();
            return res.status(200).json(data);
        }
        
        // ==================== TEST INFO ====================
        if (action === "testinfo") {
            const { test_id } = req.query;
            if (!test_id) {
                return res.status(400).json({ error: "test_id required" });
            }
            const response = await fetch(
                `${TEST}/test/get-test-instructions?test_id=${test_id}`,
                { headers: buildAuthHeaders() }
            );
            const data = await response.json();
            return res.status(200).json(data);
        }
        
        // ==================== TEST DATA ====================
        if (action === "testdata") {
            const { test_id } = req.query;
            if (!test_id) {
                return res.status(400).json({ error: "test_id required" });
            }
            const response = await fetch(
                `${TEST}/test/get-test-data?test_id=${test_id}`,
                { headers: buildAuthHeaders() }
            );
            const data = await response.json();
            return res.status(200).json(data);
        }
        
        // ==================== STATS ====================
        if (action === "stats") {
            return res.status(200).json({
                success: true,
                status: "healthy",
                timestamp: Date.now(),
                allowedOrigins: ALLOWED_ORIGINS
            });
        }
        
        // ==================== DEFAULT ====================
        return res.status(400).json({
            error: "Invalid action",
            actions: ["sendotp", "verifyotp", "refresh", "course", "content", "video", "player", "pdf", "live", "upcoming", "testinfo", "testdata", "stats"]
        });
        
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
