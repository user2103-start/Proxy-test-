export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Turnstile-Token");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const {
      action,
      course_id,
      folder_id,
      video_id,
      pdf_id,
      parent_id,
      url
    } = req.body || req.query;

    const turnstileToken = req.headers["x-turnstile-token"];

    if (!turnstileToken) {
      return res.status(400).json({
        success: false,
        error: "Turnstile token required in X-Turnstile-Token header"
      });
    }

    const API_BASE = "https://studybeepro.site/vib";

    const HEADERS = {
      "accept": "*/*",
      "auth-key": "appxapi",
      "client-service": "Appx",
      "origin": "https://www.vibrantacademy.com",
      "referer": "https://www.vibrantacademy.com/",
      "source": "website",
      "CF-Turnstile-Response": turnstileToken  // ← Magic!
    };

    let targetUrl = "";

    switch (action) {
      case "root":
        targetUrl = `${API_BASE}/get/folder_contentsv3?course_id=${course_id}&parent_id=-1&start=0`;
        break;
      case "folder":
        targetUrl = `${API_BASE}/get/folder_contentsv3?course_id=${course_id}&parent_id=${folder_id}&start=0`;
        break;
      case "live":
        targetUrl = `${API_BASE}/get/course_contents_by_live_status?course_id=${course_id}&start=0`;
        break;
      case "previous":
        targetUrl = `${API_BASE}/get/get_previous_live_videos?course_id=${course_id}&start=0&folder_wise_course=1`;
        break;
      case "video":
        targetUrl = `${API_BASE}/?video_id=${video_id}&course_id=${course_id}`;
        break;
      case "player":
        targetUrl = `https://studybeepro.site/proxy?url=${encodeURIComponent(url)}`;
        break;
      case "pdf":
        targetUrl = `https://vibrant-live-api.lovable.app/api/v1/vibrant/pdf?pdf_id=${pdf_id}&course_id=${course_id}&parent_id=${parent_id}`;
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const response = await fetch(targetUrl, { headers: HEADERS });

    if (response.status === 403) {
      return res.status(403).json({
        success: false,
        error: "Turnstile token invalid or expired. Please re-verify."
      });
    }

    const contentType = response.headers.get("content-type") || "";
    res.setHeader("Content-Type", contentType);

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json({
        success: true,
        source: action,
        data
      });
    }

    const text = await response.text();
    return res.status(response.status).send(text);

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
