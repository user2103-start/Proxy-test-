export const config = {
  api: {
    responseLimit: false, // Large video segments ke liye
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Range"
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

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
      url
    } = req.query;

    const API_BASE = "https://platform.studyparcham.in/api/vibrant";

    let targetUrl = "";
    let isM3u8 = false;
    let isSegment = false;

    switch (action) {

      // Root Content
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

      // Player — returns JSON with m3u8 URL
      case "player":
        targetUrl = `${API_BASE}/play?url=${encodeURIComponent(url)}`;
        break;

      // 🔥 NEW: m3u8 proxy — actual playlist fetch karta hai
      case "m3u8":
        targetUrl = url; // direct CDN URL (signed)
        isM3u8 = true;
        break;

      // 🔥 NEW: Video segment proxy (.ts / .m4s / .mp4 chunks)
      case "segment":
        targetUrl = url;
        isSegment = true;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }

    console.log("=================================");
    console.log("ACTION:", action);
    console.log("TARGET URL:", targetUrl);
    console.log("=================================");

    // Range header forward karo (video seeking ke liye zaroori)
    const upstreamHeaders = {
      "accept": "*/*",
      "origin": "https://platform.studyparcham.in",
      "referer": "https://platform.studyparcham.in/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    };

    if (req.headers.range) {
      upstreamHeaders["range"] = req.headers.range;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: upstreamHeaders
    });

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");

    console.log("STATUS:", response.status);
    console.log("CONTENT-TYPE:", contentType);

    // Forward important headers
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);

    // ═══════════════════════════════════════════════════════════
    // 🔥 M3U8 HANDLING — Yeh sabse important hai!
    // ═══════════════════════════════════════════════════════════
    if (isM3u8 || contentType.includes("mpegurl") || targetUrl.endsWith(".m3u8") || targetUrl.includes(".m3u8")) {
      let m3u8Content = await response.text();

      // Base URL nikalo (relative URLs resolve karne ke liye)
      const baseUrl = new URL(targetUrl);
      const basePath = baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf("/") + 1);

      // Har line ko check karo
      const rewritten = m3u8Content
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();

          // Empty ya comment lines skip
          if (!trimmed) return line;
          if (trimmed.startsWith("#EXT")) {
            // #EXT-X-KEY, #EXT-X-MAP, #EXT-X-STREAM-INF ke URI="..." ko bhi rewrite karo
            if (trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                const absoluteUri = new URL(uri, basePath).toString();
                const proxyUrl = `/api/proxy?action=segment&url=${encodeURIComponent(absoluteUri)}`;
                return `URI="${proxyUrl}"`;
              });
            }
            return line;
          }

          // Sirf URL lines (child playlist ya segment)
          const absoluteUrl = new URL(trimmed, basePath).toString();

          // Agar .m3u8 hai to m3u8 action, warna segment action
          const isChildM3u8 = absoluteUrl.includes(".m3u8") || absoluteUrl.includes("m3u8");

          if (isChildM3u8) {
            return `/api/proxy?action=m3u8&url=${encodeURIComponent(absoluteUrl)}`;
          } else {
            return `/api/proxy?action=segment&url=${encodeURIComponent(absoluteUrl)}`;
          }
        })
        .join("\n");

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");

      return res.status(response.status).send(rewritten);
    }

    // ═══════════════════════════════════════════════════════════
    // SEGMENT / BINARY HANDLING — Video chunks
    // ═══════════════════════════════════════════════════════════
    if (isSegment) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.status(response.status).send(buffer);
    }

    // ═══════════════════════════════════════════════════════════
    // JSON Response
    // ═══════════════════════════════════════════════════════════
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json({
        success: response.ok,
        source: action,
        data
      });
    }

    // Fallback — text
    const text = await response.text();
    return res.status(response.status).send(text);

  } catch (err) {
    console.error("PROXY ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
