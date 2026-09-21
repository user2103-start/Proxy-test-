export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { action, course_id, folder_id, video_id, parent_id, pdf_id, url } = req.query;
    const API_BASE = "https://platform.studyparcham.in/api/vibrant";
    let targetUrl = "";

    switch (action) {
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
      
      // --- YE WALA FIX KIYA ---
      case "player":
        // url already pura platform.../api/vibrant/play?url=... hai to direct use karo
        if (url && url.includes("platform.studyparcham.in")) {
          // Next.js query ko ek baar decode kar deta hai, isliye direct use
          targetUrl = url;
        } else {
          // agar andar wala transcoded-videos wala url hai tabhi wrap karo
          targetUrl = `${API_BASE}/play?url=${encodeURIComponent(url)}`;
        }
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://platform.studyparcham.in/",
        "accept": "*/*"
      }
    });

    const contentType = response.headers.get("content-type") || "";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-cache");

    const text = await response.text();
    return res.status(response.status).send(text);

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
