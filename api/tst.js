export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
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
      url
    } = req.query;

    const API_BASE = "https://platform.studyparcham.in/api/vibrant";

    let targetUrl = "";

    switch (action) {

      // Root Content
      case "root":
        targetUrl =
          `${API_BASE}/course?course_id=${course_id}&parent_id=-1&start=0`;
        break;

      // Folder Content
      case "folder":
        targetUrl =
          `${API_BASE}/course?course_id=${course_id}&parent_id=${folder_id}&start=0`;
        break;

      // Video Details
      case "video":
        targetUrl =
          `${API_BASE}/videopower?course_id=${course_id}&video_id=${video_id}`;
        break;

      // PDF Details
      case "pdf":
        targetUrl =
          `${API_BASE}/hehe?course_id=${course_id}&parent_id=${parent_id}&content_id=${pdf_id}`;
        break;

      // Player
      case "player":
        targetUrl =
          `${API_BASE}/play?url=${encodeURIComponent(url)}`;
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

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "accept": "*/*",
        "origin": "https://platform.studyparcham.in",
        "referer": "https://platform.studyparcham.in/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      }
    });

    const contentType = response.headers.get("content-type") || "";

    console.log("STATUS:", response.status);
    console.log("CONTENT-TYPE:", contentType);

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Forward useful headers
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    }

    // JSON Response
    if (contentType.includes("application/json")) {
      const data = await response.json();

      return res.status(response.status).json({
        success: response.ok,
        source: action,
        data
      });
    }

    // HTML / M3U8 / Text
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
