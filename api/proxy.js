// ============================================================
// api/proxy.js - UPDATED WITH TOKEN FIX
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const APP_ID      = "1772100600";
const DEVICE_ID   = "ae2fa506-85ca-418d-a449-ec5868dc6665";
const DEFAULT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjMwNTYxLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1ODY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzk3MTcyODMsImV4cCI6MTc4MjMwOTI4M30.8GtwQYGKQACNXyz2N_dtrm1YmIeo6f3B81_MXiQf3aU";

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

function getValidToken(userToken) {
    // Agar user ne token diya hai to use karo, nahi to default token use karo
    if (userToken && !isTokenExpired(userToken)) {
        return userToken.startsWith("Bearer ") ? userToken : `Bearer ${userToken}`;
    }
    // Default token (jo tune diya)
    return `Bearer ${DEFAULT_TOKEN}`;
}

function getUserIdFromToken(token) {
    try {
        if (!token) return null;
        const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
        const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
        return String(payload.user_id);
    } catch(e) {
        return "3230561";
    }
}

function buildHeaders(accessToken, userId) {
    const headers = {
        "accept": "application/json, text/plain, */*",
        "app_id": APP_ID,
        "content-type": "application/json",
        "origin": "https://missionjeet.in",
        "referer": "https://missionjeet.in/",
        "platform": "3",
        "version": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
    if (accessToken) headers["authorization"] = accessToken;
    if (userId) headers["user_id"] = userId;
    return headers;
}

function buildAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "app_id": APP_ID,
        "platform": "3",
        "version": "1"
    };
}

// ============================================================
// PLAYER HTML TEMPLATE
// ============================================================

function getPlayerHTML(videoUrl, title = "Video Player") {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Mission JEET - ${title}</title>
    <link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet">
    <script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; font-family: system-ui, sans-serif; }
        .container { width: 100%; height: 100vh; display: flex; flex-direction: column; background: #000; }
        .video-wrapper { flex: 1; background: #000; position: relative; }
        .video-js { width: 100%; height: 100%; }
        .controls-bar {
            background: #1a1a2e;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            border-top: 1px solid #2d2d44;
        }
        .quality-select, .speed-select {
            background: #2d2d44;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        }
        .back-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
        }
        .title {
            color: white;
            flex: 1;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="video-wrapper">
            <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto">
                <p class="vjs-no-js">Please enable JavaScript to view this video.</p>
            </video>
        </div>
        <div class="controls-bar">
            <button class="back-btn" onclick="window.history.back()">← Back</button>
            <div class="title" id="videoTitle">${title}</div>
            <select id="qualitySelect" class="quality-select">
                <option value="auto">Auto Quality</option>
            </select>
            <select id="speedSelect" class="speed-select">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
            </select>
        </div>
    </div>
    <script>
        const videoUrl = decodeURIComponent("${videoUrl}");
        const videoElement = document.getElementById('my-video');
        const player = videojs(videoElement);
        
        if (Hls.isSupported()) {
            const hls = new Hls({ debug: false, enableWorker: true });
            hls.loadSource(videoUrl);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                const levels = hls.levels;
                const qualitySelect = document.getElementById('qualitySelect');
                if (levels && levels.length > 1) {
                    qualitySelect.innerHTML = '<option value="auto">Auto Quality</option>';
                    levels.forEach((level, index) => {
                        if (level.height) {
                            const option = document.createElement('option');
                            option.value = index;
                            option.textContent = level.height + 'p';
                            qualitySelect.appendChild(option);
                        }
                    });
                    qualitySelect.addEventListener('change', function() {
                        const selected = parseInt(this.value);
                        hls.currentLevel = isNaN(selected) ? -1 : selected;
                    });
                }
                player.play();
            });
            hls.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    player.error({ message: 'Video playback error' });
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = videoUrl;
            videoElement.addEventListener('loadedmetadata', function() {
                player.play();
            });
        } else {
            player.error({ message: 'HLS not supported' });
        }
        
        document.getElementById('speedSelect').addEventListener('change', function() {
            player.playbackRate(parseFloat(this.value));
        });
    </script>
</body>
</html>`;
}

function getPDFViewerHTML(pdfUrl) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mission JEET - PDF Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f0f0f0; height: 100vh; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
        .download-btn, .back-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a1a2e;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
            border: none;
        }
        .back-btn { right: auto; left: 20px; background: #667eea; }
    </style>
</head>
<body>
    <iframe src="${pdfUrl}" title="PDF Viewer"></iframe>
    <button class="back-btn" onclick="history.back()">← Back</button>
    <a href="${pdfUrl}" class="download-btn" download>📥 Download PDF</a>
</body>
</html>`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Refresh-Token, X-User-Id, X-Device-Id");
    
    if (req.method === "OPTIONS") return res.status(200).end();
    
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ success: false, error: "Too many requests" });
    }
    
    let body = req.body || {};
    if (typeof body === "string") {
        try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    body = Object.assign({}, req.query, body);
    
    const { action } = req.query;
    const userToken = req.headers["authorization"] || null;
    
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
            
            if (accessToken && refreshToken) {
                return res.status(200).json({
                    success: true,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresIn: Date.now() + 30 * 24 * 60 * 60 * 1000
                });
            }
            return res.status(200).json(data);
        }
        
        // ============================================================
        // ACTION: refresh
        // ============================================================
        if (action === "refresh") {
            const { refreshToken } = body;
            if (!refreshToken) {
                return res.status(400).json({ success: false, error: "Refresh token required" });
            }
            const response = await fetch(`${AUTH}/auth/refresh-token`, {
                method: "POST",
                headers: buildAuthHeaders(),
                body: JSON.stringify({ refreshToken })
            });
            const data = await response.json();
            const newAccessToken = data.accessToken || data.data?.accessToken;
            if (newAccessToken) {
                return res.json({ success: true, accessToken: newAccessToken });
            }
            return res.status(401).json({ success: false, error: "Refresh failed" });
        }
        
        // ============================================================
        // ACTION: course
        // ============================================================
        if (action === "course") {
            const { course_id, parent_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            const validToken = getValidToken(userToken);
            const userId = getUserIdFromToken(validToken);
            const response = await fetch(`${NT}/course/course-details`, {
                method: "POST",
                headers: buildHeaders(validToken, userId),
                body: JSON.stringify({
                    course_id: String(course_id),
                    parent_id: String(parent_id || "0")
                })
            });
            const data = await response.json();
            return res.status(200).json(data);
        }
        
        // ============================================================
        // ACTION: content
        // ============================================================
        if (action === "content") {
            const { course_id, folder_id, parent_course_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            const validToken = getValidToken(userToken);
            const userId = getUserIdFromToken(validToken);
            const response = await fetch(`${NT}/course/all-content`, {
                method: "POST",
                headers: buildHeaders(validToken, userId),
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
            return res.status(200).json(data);
        }
        
        // ============================================================
        // ACTION: video
        // ============================================================
        if (action === "video") {
            const { content_id, course_id } = req.query;
            if (!content_id || !course_id) {
                return res.status(400).json({ error: "content_id and course_id required" });
            }
            const validToken = getValidToken(userToken);
            const userId = getUserIdFromToken(validToken);
            const response = await fetch(
                `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
                { method: "GET", headers: buildHeaders(validToken, userId) }
            );
            const data = await response.json();
            
            if (data.success && data.data && data.data.file_url) {
                data.data.playerUrl = `/api/proxy?action=player&url=${encodeURIComponent(data.data.file_url)}&title=${encodeURIComponent(data.data.title || 'Video')}`;
                data.data.playerType = "hls";
            }
            return res.status(200).json(data);
        }
        
        // ============================================================
        // ACTION: player
        // ============================================================
        if (action === "player") {
            const { url, title } = req.query;
            if (!url) {
                return res.status(400).json({ error: "url parameter required" });
            }
            const decodedUrl = decodeURIComponent(url);
            const videoTitle = title ? decodeURIComponent(title) : "Video Player";
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(getPlayerHTML(decodedUrl, videoTitle));
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
        // ACTION: live
        // ============================================================
        if (action === "live") {
            const { course_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            const validToken = getValidToken(userToken);
            const userId = getUserIdFromToken(validToken);
            const response = await fetch(`${NT}/course/all-content`, {
                method: "POST",
                headers: buildHeaders(validToken, userId),
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
                const liveItems = data.data.filter(item => 
                    item.data?.is_live === 1 || 
                    (item.data?.file_type === 2 && item.data?.video_type === 3 && item.data?.is_live === 1)
                );
                data.live = liveItems;
            }
            return res.status(200).json(data);
        }
        
        // ============================================================
        // ACTION: upcoming
        // ============================================================
        if (action === "upcoming") {
            const { course_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            
