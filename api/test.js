export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH_KEY = "appxapi";
  const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE4NjYwOCIsInRpbWVzdGFtcCI6MTc4MDIxMjQ1OSwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpFNE5qWXdPQ0lzSW1WdFlXbHNJam9pWjJGeVlXeHBlREV4TVVCcFptTnZZWFF1WTI5dElpd2libUZ0WlNJNklpSXNJblJsYm1GdWRGUjVjR1VpT2lKMWMyVnlJaXdpZEdWdVlXNTBUbUZ0WlNJNkluWnBZbkpoYm5SaFkyRmtaVzE1YTI5MFlWOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuWnhUczRIckotOGwxeWE5WnpkNEdLS3dkbFkxSVJ1WDBPYzJnRFE3bUEyMCJ9.OjTJvVHdQJadu5AXAy-rn1NzT-ZGPP5ckDPkW3V1RYo";
  const USER_ID = "186608";
  const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in";

  const { endpoint, course_id, parent_id, video_id, recording_schedule, start = 0 } = req.query;

  let url;
  let method = "GET";
  let body = null;

  if (endpoint === "folders") {
    url = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=${parent_id}&start=${start}`;
  } else if (endpoint === "video") {
    url = `${BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=1&lc_app_api_url=`;
  } else if (endpoint === "playback") {
    // Direct CDN path with authorization bypass
    url = `https://appx-content-v2.classx.co.in/hls/${recording_schedule}/playlist.m3u8`;
    method = "GET";
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
        "source": "website",
        ...(method === "POST" && { "Content-Type": "application/json" })
      },
      ...(body && { body })
    });

    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const data = await response.text();
      res.setHeader("Content-Type", "text/plain");
      res.status(response.status).end(data);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
      }
