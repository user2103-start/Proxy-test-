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
      pdf_id,
      parent_id,
      url
    } = req.query || req.body;

    const API_BASE = "https://studybeepro.site/vib";

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
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }

    // ✨ BROWSERLESS MAGIC
    const browserlessResponse = await fetch('https://chrome.browserless.io/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        rejectResourceTypes: ['image', 'stylesheet', 'font', 'media'],
        timeout: 30000,
        waitForFunction: `() => {
          try {
            const data = JSON.parse(document.body.innerText);
            return !!data;
          } catch {
            return document.readyState === 'complete';
          }
        }`
      })
    });

    if (!browserlessResponse.ok) {
      throw new Error(`Browserless error: ${browserlessResponse.statusText}`);
    }

    const html = await browserlessResponse.text();

    // Try to extract JSON
    try {
      const jsonMatch = html.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return res.status(200).json({
          success: true,
          source: action,
          data
        });
      }
    } catch (e) {
      // Return raw HTML if JSON extraction fails
      return res.status(200).send(html);
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
