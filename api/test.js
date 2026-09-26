export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH_KEY = "appxapi";
  const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjIxNzUyNyIsInRpbWVzdGFtcCI6MTc5MDM1MDM2NCwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpJeE56VXlOeUlzSW1WdFlXbHNJam9pWTJGcllYUTNPRGt3TmtCdmJXRnVZWEowY3k1amIyMGlMQ0p1WVcxbElqb2lJaXdpZEdWdVlXNTBWSGx3WlNJNkluVnpaWElpTENKMFpXNWhiblJPWVcxbElqb2lkbWxpY21GdWRHRmpZV1JsYlhscmIzUmhYMlJpSWl3aWRHVnVZVzUwU1dRaU9pSWlMQ0prYVhOd2IzTmhZbXhsSWpwbVlXeHpaWDAucElueFpwYWpWRlZRWlNRVFRVVnREU1BFMDMydGhEVFg3QXV2MGt1YzdpbyJ9.sNPPYz9sGSpURYqXAEiRoKG24DVIRvtxU5HBb2oHRXM";
  const USER_ID = "217527";
  const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in";

  const defaultHeaders = {
    "Auth-Key": AUTH_KEY,
    "Authorization": JWT_TOKEN,
    "Client-Service": "Appx",
    "User-ID": USER_ID,
    "Origin": "https://www.vibrantacademy.com",
    "source": "website"
  };

  const { endpoint, course_id, parent_id, video_id, live_course_id, start = 0 } = req.query;

  let url;
  let method = "GET";
  let body = null;
  let contentType = "application/json";

  try {
    // GET FOLDER CONTENTS
    if (endpoint === "folders") {
      url = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=${parent_id}&start=${start}`;
    } 
    // GET VIDEO DETAILS
    else if (endpoint === "video") {
      url = `${BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=1`;
    } 
    // WATCH/UNLOCK VIDEO
    else if (endpoint === "watch") {
      url = `${BASE_URL}/post/watch_videov2`;
      method = "POST";
      const lcId = live_course_id || course_id;
      body = `course_id=${course_id}&live_course_id=${lcId}&user_id=${USER_ID}&ytFlag=0&folder_wise_course=1`;
      contentType = "application/x-www-form-urlencoded;charset=utf-8";
    } 
    // GET SIGNED URL FOR VIDEO PLAYBACK
    else if (endpoint === "getsigned") {
      url = `${BASE_URL}/post/generateTencentWebsitePresignedUrl`;
      method = "POST";
      
      const filePath = req.query.filePath;
      if (!filePath) {
        return res.status(400).json({ 
          error: "filePath parameter required",
          example: "?endpoint=getsigned&filePath=vibrantacademykota-data/3755-1774348200/480p/master.m3u8"
        });
      }
      
      body = JSON.stringify({
        filePath: filePath,
        type: "video"
      });
      contentType = "application/json";
    }
    // INVALID ENDPOINT
    else {
      return res.status(400).json({ 
        error: "Invalid endpoint",
        valid_endpoints: ["folders", "video", "watch", "getsigned"]
      });
    }

    // MAKE REQUEST TO API
    const response = await fetch(url, {
      method,
      headers: {
        ...defaultHeaders,
        ...(method === "POST" && { "Content-Type": contentType })
      },
      ...(body && { body })
    });

    const respContentType = response.headers.get("content-type");
    
    if (respContentType && respContentType.includes("application/json")) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const data = await response.text();
      res.setHeader("Content-Type", respContentType || "text/plain");
      res.status(response.status).end(data);
    }

  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
