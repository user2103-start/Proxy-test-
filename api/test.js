export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH_KEY = "appxapi";
  const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...";
  const USER_ID = "186608";
  const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in";

  const { endpoint, course_id, parent_id, video_id, recording_schedule, start = 0 } = req.query;

  let url;
  let method = "GET";
  let body = null;
  let contentType = "application/json";

  if (endpoint === "folders") {
    url = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=${parent_id}&start=${start}`;
  } else if (endpoint === "video") {
    url = `${BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=1&lc_app_api_url=`;
  } else if (endpoint === "playback") {
    url = `${BASE_URL}/post/generateTencentWebsitePresignedUrl`;
    method = "POST";
    body = JSON.stringify({
      filePath: `recordings/${recording_schedule}.m3u8`,
      type: "video"
    });
    contentType = "application/json";   // ✅ Tencent ke liye json, PUT ke liye file type
  } else {
    return res.status(400).json({ error: `Invalid endpoint: ${endpoint}` });
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Auth-Key": AUTH_KEY,
        "Authorization": JWT_TOKEN,
        "Client-Service": "Appx",
        "User-ID": USER_ID,
        "Origin": "https://www.vibrantacademy.com",
        "Referer": "https://www.vibrantacademy.com/",          // ✅ ADD
        "source": "website",
        "Accept": "application/json, text/plain, */*",          // ✅ ADD
        "Accept-Language": "en-US,en;q=0.9",                     // ✅ ADD
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",  // ✅ ADD
        "Content-Type": contentType,
        ...(req.headers.cookie && { "Cookie": req.headers.cookie })  // ✅ ADD
      },
      ...(body && { body })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
