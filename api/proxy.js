// ============================================================
// api/proxy.js - COMPLETE PROXY WITH WORKING PLAYER
// ============================================================

const AUTH = "https://auth.nexttoppers.com";
const NT   = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

const APP_ID      = "1772100600";
const DEVICE_ID   = "ae2fa506-85ca-418d-a449-ec5868dc6665";

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
        if (!token) return null;
        const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
        const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
        return String(payload.user_id);
    } catch(e) {
        return null;
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
            return { success: true, accessToken: newAccessToken, expiresIn: getTokenExpiry(newAccessToken) };
        }
        return { success: false, error: "Refresh failed" };
    } catch(e) {
        return { success: false, error: e.message };
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
// PLAYER HTML TEMPLATE (WORKING)
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
            text-decoration: none;
            display: inline-block;
        }
        .title {
            color: white;
            flex: 1;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        @media (max-width: 768px) {
            .controls-bar { padding: 8px 12px; }
            .quality-select, .speed-select { padding: 4px 8px; font-size: 11px; }
            .title { font-size: 12px; }
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
        
        let hlsPlayer = null;
        
        if (Hls.isSupported()) {
            hlsPlayer = new Hls({ debug: false, enableWorker: true });
            hlsPlayer.loadSource(videoUrl);
            hlsPlayer.attachMedia(videoElement);
            hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
                // Populate quality levels
                const levels = hlsPlayer.levels;
                const qualitySelect = document.getElementById('qualitySelect');
                if (levels && levels.length > 1) {
                    qualitySelect.innerHTML = '<option value="auto">Auto Quality</option>';
                    levels.forEach((level, index) => {
                        const height = level.height;
                        if (height) {
                            const option = document.createElement('option');
                            option.value = index;
                            option.textContent = height + 'p';
                            qualitySelect.appendChild(option);
                        }
                    });
                    
                    qualitySelect.addEventListener('change', function() {
                        const selected = parseInt(this.value);
                        if (isNaN(selected)) {
                            hlsPlayer.currentLevel = -1;
                        } else {
                            hlsPlayer.currentLevel = selected;
                        }
                    });
                }
                player.play();
            });
            hlsPlayer.on(Hls.Events.ERROR, function(event, data) {
                console.error('HLS Error:', data);
                if (data.fatal) {
                    player.error({ message: 'Video playback error. Please try again later.' });
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = videoUrl;
            videoElement.addEventListener('loadedmetadata', function() {
                player.play();
            });
        } else {
            player.error({ message: 'HLS not supported in this browser.' });
        }
        
        // Speed control
        const speedSelect = document.getElementById('speedSelect');
        speedSelect.addEventListener('change', function() {
            player.playbackRate(parseFloat(this.value));
        });
        
        // Save last watched time
        let saveInterval = setInterval(function() {
            const currentTime = player.currentTime();
            if (currentTime > 5) {
                localStorage.setItem('lastWatchedTime', currentTime);
            }
        }, 5000);
        
        // Restore last watched time
        const savedTime = localStorage.getItem('lastWatchedTime');
        if (savedTime && parseFloat(savedTime) > 10) {
            player.currentTime(parseFloat(savedTime));
        }
    </script>
</body>
</html>`;
}

// ============================================================
// PDF VIEWER HTML
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
        .download-btn, .back-btn {
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
            cursor: pointer;
            border: none;
        }
        .back-btn {
            right: auto;
            left: 20px;
            background: #667eea;
        }
        .download-btn:hover, .back-btn:hover { opacity: 0.9; }
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
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Refresh-Token, X-User-Id, X-Device-Id");
    
    if (req.method === "OPTIONS") return res.status(200).end();
    
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ success: false, error: "Too many requests. Please wait a minute." });
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
                return res.status(400).json({ success: false, error: "Refresh token required" });
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
            if (accessToken && isTokenExpired(accessToken) && refreshTokenHeader) {
                const refreshResult = await refreshAccessToken(refreshTokenHeader);
                if (refreshResult.success) {
                    accessToken = `Bearer ${refreshResult.accessToken}`;
                }
            }
            const finalToken = accessToken || `Bearer ${userToken}`;
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
        // ACTION: content
        // ============================================================
        if (action === "content") {
            const { course_id, folder_id, parent_course_id } = req.query;
            if (!course_id) {
                return res.status(400).json({ error: "course_id required" });
            }
            let accessToken = userToken;
            let userId = getUserIdFromToken(accessToken);
            if (accessToken && isTokenExpired(accessToken) && refreshTokenHeader) {
                const refreshResult = await refreshAccessToken(refreshTokenHeader);
                if (refreshResult.success) {
                    accessToken = `Bearer ${refreshResult.accessToken}`;
                }
            }
            const finalToken = accessToken || `Bearer ${userToken}`;
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
            
            // Group content by title
            if (data.success && data.data && Array.isArray(data.data)) {
                const groupedMap = new Map();
                for (const item of data.data) {
                    const title = item.title;
                    if (!groupedMap.has(title)) {
                        groupedMap.set(title, { title, video: null, pdf: null, other: [] });
                    }
                    const group = groupedMap.get(title);
                    if (item.data?.file_type === 2) group.video = item;
                    else if (item.data?.file_type === 1 || item.data?.file_type === 5) group.pdf = item;
                    else group.other.push(item);
                }
                data.grouped = Array.from(groupedMap.values());
            }
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
            let accessToken = userToken;
            let userId = getUserIdFromToken(accessToken);
            if (accessToken && isTokenExpired(accessToken) && refreshTokenHeader) {
                const refreshResult = await refreshAccessToken(refreshTokenHeader);
                if (refreshResult.success) {
                    accessToken = `Bearer ${refreshResult.accessToken}`;
                }
            }
            const finalToken = accessToken || `Bearer ${userToken}`;
            const response = await fetch(
                `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
                { method: "GET", headers: buildHeaders(finalToken, userId) }
            );
            const data = await response.json();
            
            if (data.success && data.data) {
                const content = data.data;
                if (content.file_url) {
                    if (content.file_url.includes('.m3u8')) {
                        content.playerUrl = `/api/proxy?action=player&url=${encodeURIComponent(content.file_url)}&title=${encodeURIComponent(content.title || 'Video')}`;
                        content.playerType = "hls";
                    } else if (content.file_type === 1 || content.file_type === 5) {
                        content.playerUrl = `/api/proxy?action=pdf&url=${encodeURIComponent(content.file_url)}`;
                        content.playerType = "pdf";
                    } else {
                        content.playerUrl = content.file_url;
                        content.playerType = "direct";
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
        // ACTION: player - WORKING NOW
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
            let accessToken = userToken;
            let userId = getUserIdFromToken(accessToken);
            if (accessToken && isTokenExpired(accessToken) && refreshTokenHeader) {
                const refreshResult = await refreshAccessToken(refreshTokenHeader);
                if (refreshResult.success) {
                    accessToken = `Bearer ${refreshResult.accessToken}`;
                }
            }
            const finalToken = accessToken || `Bearer ${userToken}`;
            const response = await fetch(`${NT}/course/all-content`, {
                method: "POST",
                headers: buildHeaders(finalToken, userId),
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
            let accessToken = userToken;
            let userId = getUserIdFromToken(accessToken);
            if (accessToken && isTokenExpired(accessToken) && refreshTokenHeader) {
                const refreshResult = await refreshAccessToken(refreshTokenHeader);
                if (refreshResult.success) {
                    accessToken = `Bearer ${refreshResult.accessToken}`;
                }
            }
            const finalToken = accessToken || `Bearer ${userToken}`;
            const response = await fetch(`${NT}/course/all-content`, {
                method: "POST",
                headers: buildHeaders(finalToken, userId),
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
            const now = Math.floor(Date.now() / 1000);
            if (data.success && data.data) {
                const upcomingItems = data.data.filter(item =>
                    item.data?.is_upcoming === 1 ||
                    (item.data?.start_time && Number(item.data.start_time) > now && item.data?.is_live !== 1)
                );
                data.upcoming = upcomingItems;
            }
            return res.status(200).json(data);
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
                { method: "GET", headers: buildHeaders(null, null) }
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
                { method: "GET", headers: buildHeaders(null, null) }
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
                note: "Proxy with working player endpoint"
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
                "player", "pdf", "live", "upcoming",
                "testinfo", "testdata", "stats"
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
