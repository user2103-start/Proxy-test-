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

    console.log("ACTION:", action);
    console.log("TARGET:", targetUrl);

    const response = await fetch(targetUrl, {
      headers: {
        "accept": "*/*"
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // Forward content type
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Forward status
    res.status(response.status);

    if (contentType.includes("application/json")) {
      const data = await response.json();

      return res.json({
        success: true,
        source: action,
        data
      });
    }

    const text = await response.text();
    return res.send(text);

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
