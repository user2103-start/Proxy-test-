export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const AUTH_KEY = "appxapi";
  const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE4NjYwOCIsInRpbWVzdGFtcCI6MTc4MDIxMjQ1OSwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpFNE5qWXdPQ0lzSW1WdFlXbHNJam9pWjJGeVlXeHBlREV4TVVCcFptTnZZWFF1WTI5dElpd2libUZ0WlNJNklpSXNJblJsYm1GdWRGUjVjR1VpT2lKMWMyVnlJaXdpZEdWdVlXNTBUbUZ0WlNJNkluWnBZbkpoYm5SaFkyRmtaVzE1YTI5MFlWOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuWnhUczRIckotOGwxeWE5WnpkNEdLS3dkbFkxSVJ1WDBPYzJnRFE3bUEyMCJ9.OjTJvVHdQJadu5AXAy-rn1NzT-ZGPP5ckDPkW3V1RYo";
  const USER_ID = "186608";
  const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in";

  const defaultHeaders = {
    "Auth-Key": AUTH_KEY,
    "Authorization": JWT_TOKEN,
    "Client-Service": "Appx",
    "User-ID": USER_ID,
    "Origin": "https://www.vibrantacademy.com",
    "Referer": "https://www.vibrantacademy.com/course/7",
    "source": "website",
    "is-safari": "0"
  };

  const { endpoint, course_id, parent_id, video_id, live_course_id, recording_schedule, userid, start = 0 } = req.query;

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
    // GET LIVE VIEW DATA (Firebase Realtime DB)
    else if (endpoint === "livedata") {
      const schedule = recording_schedule || req.query.schedule;
      const uid = userid || USER_ID;
      
      if (!schedule) {
        return res.status(400).json({ 
          error: "recording_schedule parameter required",
          example: "?endpoint=livedata&recording_schedule=T_177434780170759638&userid=217527"
        });
      }
      
      url = `${BASE_URL}/LiveViewData/${schedule}/${uid}`;
    }
    // INVALID ENDPOINT
    else {
      return res.status(400).json({ 
        error: "Invalid endpoint",
        valid_endpoints: ["folders", "video", "watch", "getsigned", "livedata"]
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
