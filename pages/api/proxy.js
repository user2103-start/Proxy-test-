// pages/api/proxy.js - BODY PARSING FIXED ✅
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-User-Token,X-User-Id");
  
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { action } = req.query;
  
  // 🔥 BODY FIX - Raw body read karo
  let body = {};
  if (req.method === "POST") {
    try {
      const rawBody = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
      body = {};
    }
  }

  console.log(`[PROXY] Action: ${action}, Body:`, body);

  // Default headers
  const headers = {
    "accept": "application/json",
    "app_id": "1772100600",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjQ1MDMzLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1MDY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzg0OTQ5NjcsImV4cCI6MTc4MTA4Njk2N30.40g-NIb1n2f8oA7PPIqTgD3Y1zDrsQCpCxBajwpMaJY",
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "platform": "3",
    "user_id": "3245033",
    "version": "1"
  };

  try {
    // TEST - Pehle ye check karo
    if (action === "test") {
      res.status(200).json({ 
        success: true, 
        message: "Proxy Working Perfectly! 🎉",
        body_received: body,
        available: ["send-otp", "verify-otp", "course", "content", "video", "live", "test-list"]
      });
      return;
    }

    // AUTH: Send OTP
    if (action === "send-otp") {
      const { mobile } = body;
      if (!mobile) {
        res.status(400).json({ error: "mobile required" });
        return;
      }

      const authHeaders = {
        "app_id": "1772100600",
        "content-type": "application/json",
        "platform": "3"
      };

      const r = await fetch("https://auth.nexttoppers.com/auth/send-otp", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          mobile,
          device_id: "ae2fa506-85ca-418d-a449-ec5068dc6665",
          mobile_otp_login: 1,
          otp: ""
        })
      });

      const data = await r.json();
      console.log("[SEND-OTP]", data);
      res.status(r.status).json(data);
      return;
    }

    // AUTH: Verify OTP
    if (action === "verify-otp") {
      const { mobile, otp } = body;
      if (!mobile || !otp) {
        res.status(400).json({ error: "mobile & otp required" });
        return;
      }

      const authHeaders = {
        "app_id": "1772100600",
        "content-type": "application/json",
        "platform": "3"
      };

      const r = await fetch("https://auth.nexttoppers.com/auth/verify-otp", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          mobile,
          otp,
          signup_needed: "0",
          device_id: "ae2fa506-85ca-418d-a449-ec5068dc6665"
        })
      });

      const data = await r.json();
      console.log("[VERIFY-OTP]", data);
      res.status(r.status).json(data);
      return;
    }

    // COURSE: Course Details
    if (action === "course") {
      const { course_id, parent_id = "0" } = body;
      const r = await fetch("https://course.nexttoppers.com/course/course-details", {
        method: "POST",
        headers,
        body: JSON.stringify({
          course_id: String(course_id),
          parent_id: String(parent_id)
        })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    // COURSE: Content List
    if (action === "content") {
      const { course_id, folder_id = "0", parent_course_id = "0" } = body;
      const r = await fetch("https://course.nexttoppers.com/course/all-content", {
        method: "POST",
        headers,
        body: JSON.stringify({
          course_id: String(course_id),
          folder_id: String(folder_id),
          parent_course_id: String(parent_course_id),
          limit: "100",
          page: "1"
        })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    res.status(400).json({ 
      error: "Invalid action", 
      test_first: "Try ?action=test",
      available: ["test", "send-otp", "verify-otp", "course", "content"]
    });

  } catch (error) {
    console.error("[PROXY ERROR]", error);
    res.status(500).json({ error: error.message });
  }
}
