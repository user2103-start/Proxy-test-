// api/proxy.js

const AUTH_KEY = "appxapi";
const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...";
const USER_ID = "186608";
const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in";

const headers = {
  "Auth-Key": AUTH_KEY,
  "Authorization": JWT_TOKEN,
  "Client-Service": "Appx",
  "User-ID": USER_ID,
  "Origin": "https://www.vibrantacademy.com",
  "source": "website"
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { endpoint, course_id, parent_id, video_id, recording_schedule, start = 0 } = req.query;

  try {
    let url;
    let method = "GET";
    let body = null;

    if (endpoint === "folders") {
      url = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=${parent_id}&start=${start}`;
    } else if (endpoint === "video") {
      url = `${BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}`;
    } else if (endpoint === "playback") {
      // YE WALA - VIDEO URL GENERATE KARNA
      url = `${BASE_URL}/post/generateTencentWebsitePresignedUrl`;
      method = "POST";
      body = JSON.stringify({
        filePath: recording_schedule,
        type: "video"
      });
    } else {
      return res.status(400).json({ error: "Invalid endpoint" });
    }

    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        ...(method === "POST" && { "Content-Type": "application/json" })
      },
      ...(body && { body })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
