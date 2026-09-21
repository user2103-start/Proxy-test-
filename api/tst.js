// ═══════════════════════════════════════════════════════════════════
//  Study Parcham Vibrant Proxy — Production Ready
//  Handles: root, folder, video, pdf, player, m3u8, segment
// ═══════════════════════════════════════════════════════════════════

export const config = {
  api: {
    responseLimit: false,        // Large video segments ke liye
    bodyParser: false,           // Binary data ke liye
    externalResolver: true,
  },
};

const STUDY_PARCHAM_BASE = "https://platform.studyparcham.in";
const API_BASE = `${STUDY_PARCHAM_BASE}/api/vibrant`;

// Apna proxy path — agar route alag hai to yahan change karo
const PROXY_PATH = "/api/tst";

// ═══════════════════════════════════════════════════════════════════
//  Helper: URL ko absolute banata hai
// ═══════════════════════════════════════════════════════════════════
function toAbsolute(baseUrl, relative) {
  try {
    return new URL(relative, baseUrl).toString();
  } catch {
    return relative;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Helper: m3u8 content ko rewrite karta hai — saare URLs proxy se
// ═══════════════════════════════════════════════════════════════════
function rewriteM3U8(content, originalUrl) {
  // Base path nikalo (jahan master.m3u8 hai)
  const urlObj = new URL(originalUrl);
  const basePath = urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf("/") + 1);

  const lines = content.split("\n");
  const rewritten = [];

  for (let line of lines) {
    const trimmed = line.trim();

    // Empty line — same rakho
    if (!trimmed) {
      rewritten.push(line);
      continue;
    }

    // Comment / tag line
    if (trimmed.startsWith("#")) {
      // #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA jaise tags mein URI="..." hota hai
      if (trimmed.includes('URI="')) {
        const newLine = trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
          // Data URI skip karo
          if (uri.startsWith("data:")) return match;

          const absoluteUri = toAbsolute(basePath, uri);
          const isPlaylist = absoluteUri.includes(".m3u8");
          const action = isPlaylist ? "m3u8" : "segment";
          const proxied = `${PROXY_PATH}?action=${action}&url=${encodeURIComponent(absoluteUri)}`;
          return `URI="${proxied}"`;
        });
        rewritten.push(newLine);
      } else {
        rewritten.push(line);
      }
      continue;
    }

    // Plain URL line — playlist ya segment
    const absoluteUrl = toAbsolute(basePath, trimmed);
    const isPlaylist = absoluteUrl.includes(".m3u8");
    const action = isPlaylist ? "m3u8" : "segment";
    const proxied = `${PROXY_PATH}?action=${action}&url=${encodeURIComponent(absoluteUrl)}`;
    rewritten.push(proxied);
  }

  return rewritten.join("\n");
}

// ═══════════════════════════════════════════════════════════════════
//  Main Handler
// ═══════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // ─── CORS ─────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Range"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const {
      action,
      course_id,
      folder_id,
      video_id,
      parent_id,
      pdf_id,
      url,
    } = req.query;

    let targetUrl = "";
    let isM3U8Response = false;
    let isBinaryResponse = false;
    let forwardRange = false;

    // ═══════════════════════════════════════════════════════════
    //  Route by action
    // ═══════════════════════════════════════════════════════════
    switch (action) {
      // ─── JSON APIs ─────────────────────────────────────────
      case "root":
        targetUrl = `${API_BASE}/course?course_id=${course_id}&parent_id=-1&start=0`;
        break;

      case "folder":
        targetUrl = `${API_BASE}/course?course_id=${course_id}&parent_id=${folder_id}&start=0`;
        break;

      case "video":
        targetUrl = `${API_BASE}/videopower?course_id=${course_id}&video_id=${video_id}`;
        break;

      case "pdf":
        targetUrl = `${API_BASE}/hehe?course_id=${course_id}&parent_id=${parent_id}&content_id=${pdf_id}`;
        break;

      // ─── Player JSON API ───────────────────────────────────
      case "player":
        if (!url) {
          return res.status(400).json({
            success: false,
            message: "url param required for player action",
          });
        }
        targetUrl = `${API_BASE}/play?url=${encodeURIComponent(url)}`;
        break;

      // ─── 🔥 m3u8 Playlist Proxy ────────────────────────────
      case "m3u8":
        if (!url) {
          return res.status(400).json({
            success: false,
            message: "url param required for m3u8 action",
          });
        }
        // CDN pe direct mat jao — Study Parcham ke API se lo
        // (unka server IP CDN pe whitelisted hai)
        targetUrl = `${API_BASE}/play?url=${encodeURIComponent(url)}`;
        isM3U8Response = true;
        break;

      // ─── 🔥 Video Segment Proxy ────────────────────────────
      case "segment":
        if (!url) {
          return res.status(400).json({
            success: false,
            message: "url param required for segment action",
          });
        }
        targetUrl = `${API_BASE}/play?url=${encodeURIComponent(url)}`;
        isBinaryResponse = true;
        forwardRange = true;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action",
          hint: "Use one of: root, folder, video, pdf, player, m3u8, segment",
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  Logs
    // ═══════════════════════════════════════════════════════════
    console.log("════════════════════════════════════════");
    console.log("ACTION     :", action);
    console.log("TARGET URL :", targetUrl);
    console.log("════════════════════════════════════════");

    // ═══════════════════════════════════════════════════════════
    //  Upstream Fetch Headers
    // ═══════════════════════════════════════════════════════════
    const upstreamHeaders = {
      accept: "*/*",
      origin: STUDY_PARCHAM_BASE,
      referer: `${STUDY_PARCHAM_BASE}/`,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    };

    // Range header forward (seeking ke liye)
    if (forwardRange && req.headers.range) {
      upstreamHeaders["range"] = req.headers.range;
    }

    // Cookies bhi forward karo (auth ke liye)
    if (req.headers.cookie) {
      upstreamHeaders["cookie"] = req.headers.cookie;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: upstreamHeaders,
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");

    console.log("STATUS      :", response.status);
    console.log("CONTENT-TYPE:", contentType);
    console.log("FINAL URL   :", response.url);
    console.log("════════════════════════════════════════");

    // ═══════════════════════════════════════════════════════════
    //  Error Handling — Upstream error ko log karo
    // ═══════════════════════════════════════════════════════════
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("UPSTREAM ERROR BODY:", errorBody.slice(0, 500));

      return res.status(response.status).json({
        success: false,
        upstream_status: response.status,
        action,
        targetUrl,
        error_preview: errorBody.slice(0, 300),
      });
    }

    // ═══════════════════════════════════════════════════════════
    //  Response Headers Forward
    // ═══════════════════════════════════════════════════════════
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);

    // ═══════════════════════════════════════════════════════════
    //  🔥 M3U8 HANDLING — URLs Rewrite
    // ═══════════════════════════════════════════════════════════
    const looksLikeM3U8 =
      isM3U8Response ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL") ||
      targetUrl.includes(".m3u8");

    if (looksLikeM3U8) {
      let m3u8Content = await response.text();

      console.log("M3U8 PREVIEW:", m3u8Content.slice(0, 400));

      // Agar JSON aaya (kuch APIs JSON dete hain jisme m3u8 URL hoti hai)
      if (m3u8Content.trim().startsWith("{")) {
        try {
          const json = JSON.parse(m3u8Content);
          // Common fields jahan m3u8 URL hoti hai
          const nested =
            json.url ||
            json.file_url ||
            json.data?.file_url ||
            json.data?.url ||
            json.playlist ||
            json.m3u8;

          if (nested) {
            console.log("JSON detected in m3u8 action, nested URL:", nested);
            // Nested m3u8 ko fetch karo
            const nestedResponse = await fetch(
              `${API_BASE}/play?url=${encodeURIComponent(nested)}`,
              { headers: upstreamHeaders }
            );
            m3u8Content = await nestedResponse.text();
            console.log("NESTED M3U8 PREVIEW:", m3u8Content.slice(0, 400));
          }
        } catch (e) {
          console.warn("JSON parse failed:", e.message);
        }
      }

      // URLs rewrite karo
      const rewritten = rewriteM3U8(m3u8Content, url || targetUrl);

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.removeHeader("Content-Length"); // Rewritten content ki length alag hai

      return res.status(200).send(rewritten);
    }

    // ═══════════════════════════════════════════════════════════
    //  🔥 BINARY / SEGMENT HANDLING
    // ═══════════════════════════════════════════════════════════
    if (isBinaryResponse) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.status(response.status).send(buffer);
    }

    // ═══════════════════════════════════════════════════════════
    //  JSON Response
    // ═══════════════════════════════════════════════════════════
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json({
        success: true,
        source: action,
        data,
      });
    }

    // ═══════════════════════════════════════════════════════════
    //  Fallback — Text
    // ═══════════════════════════════════════════════════════════
    const text = await response.text();
    return res.status(response.status).send(text);

  } catch (err) {
    console.error("════ PROXY ERROR ════");
    console.error(err);
    console.error("═════════════════════");

    return res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}
