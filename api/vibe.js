export default async function handler(req, res) {
  try {
    const {
      action,
      course_id,
      folder_id,
      video_id,
      pdf_id,
      parent_id,
      url
    } = req.query;

    const HEADERS = {
      "accept": "*/*",
      "auth-key": "appxapi",
      "client-service": "Appx",
      "origin": "https://www.vibrantacademy.com",
      "referer": "https://www.vibrantacademy.com/",
      "source": "website"
    };

    let targetUrl = "";

    switch (action) {

      // Root Course Content
      case "root":
        targetUrl =
          `https://smex.iownprince5.workers.dev/get/folder_contentsv3?course_id=${course_id}&parent_id=-1&start=0`;
        break;

      // Folder Content
      case "folder":
        targetUrl =
          `https://smex.iownprince5.workers.dev/get/folder_contentsv3?course_id=${course_id}&parent_id=${folder_id}&start=0`;
        break;

      // Live Classes
      case "live":
        targetUrl =
          `https://smex.iownprince5.workers.dev/get/course_contents_by_live_status?course_id=${course_id}&start=0`;
        break;

      // Previous Live Classes
      case "previous":
        targetUrl =
          `https://smex.iownprince5.workers.dev/get/get_previous_live_videos?course_id=${course_id}&start=0&folder_wise_course=1`;
        break;

      // Video Info
      case "video":
        targetUrl =
          `https://smex.iownprince5.workers.dev/?video_id=${video_id}&course_id=${course_id}`;
        break;

      // Player Proxy
      case "player":
        targetUrl =
          `https://studybeepro.site/proxy?url=${encodeURIComponent(url)}`;
        break;

      // PDF API
      case "pdf":
        targetUrl =
          `https://vibrant-live-api.lovable.app/api/v1/vibrant/pdf?pdf_id=${pdf_id}&course_id=${course_id}&parent_id=${parent_id}`;
        break;

      // PDF Viewer
      case "viewer":
        targetUrl =
          `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(url)}`;
        break;

      // PDF Download
      case "download":
        targetUrl =
          `https://pdf-appx.edumate.life/?url=${encodeURIComponent(url)}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }

    const response = await fetch(targetUrl, {
      headers: HEADERS
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();

      return res.status(response.status).json({
        success: true,
        source: action,
        data
      });
    }

    const text = await response.text();

    res.setHeader("Content-Type", contentType);
    return res.status(response.status).send(text);

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
