// pages/api/proxy.js - COMPLETE VERSION (All APIs ✅)
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
  const body = req.method === "POST" ? req.body : {};
  
  // Default token/user_id
  const token = req.headers["x-user-token"] || "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjQ1MDMzLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1MDY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzg0OTQ5NjcsImV4cCI6MTc4MTA4Njk2N30.40g-NIb1n2f8oA7PPIqTgD3Y1zDrsQCpCxBajwpMaJY";
  const userId = req.headers["x-user-id"] || "3245033";

  const headers = {
    "accept": "application/json",
    "app_id": "1772100600",
    "authorization": token,
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "platform": "3",
    "user_id": userId,
    "version": "1"
  };

  try {
    // ═══════════════════════════════════════════════
    // AUTH APIs
    // ═══════════════════════════════════════════════
    
    if (action === "send-otp") {
      const { mobile } = body;
      const r = await fetch("https://auth.nexttoppers.com/auth/send-otp", {
        method: "POST",
        headers: { "app_id": "1772100600", "content-type": "application/json" },
        body: JSON.stringify({
          mobile,
          device_id: "ae2fa506-85ca-418d-a449-ec5068dc6665",
          mobile_otp_login: 1,
          otp: ""
        })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    if (action === "verify-otp") {
      const { mobile, otp } = body;
      const r = await fetch("https://auth.nexttoppers.com/auth/verify-otp", {
        method: "POST",
        headers: { "app_id": "1772100600", "content-type": "application/json" },
        body: JSON.stringify({
          mobile,
          otp,
          signup_needed: "0",
          device_id: "ae2fa506-85ca-418d-a449-ec5068dc6665"
        })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    // ═══════════════════════════════════════════════
    // COURSE APIs
    // ═══════════════════════════════════════════════

    if (action === "course") {
      const { course_id, parent_id = "0" } = body;
      const r = await fetch("https://course.nexttoppers.com/course/course-details", {
        method: "POST",
        headers,
        body: JSON.stringify({ course_id: String(course_id), parent_id: String(parent_id) })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    if (action === "content") {
      const { course_id, folder_id = "0", parent_course_id = "0" } = body;
      const r = await fetch("https://course.nexttoppers.com/course/all-content", {
        method: "POST",
        headers,
        body: JSON.stringify({
          course_id: String(course_id),
          folder_id: String(folder_id),
          parent_course_id: String(parent_course_id),
          is_free: "",
          keyword: "",
          limit: "100",
          page: "1"
        })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    if (action === "video") {
      const { content_id, course_id } = req.query;
      const r = await fetch(`https://course.nexttoppers.com/course/content-details?content_id=${content_id}&course_id=${course_id}`, {
        method: "GET",
        headers
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    if (action === "live") {
      const { course_id } = body;
      const r = await fetch("https://course.nexttoppers.com/course/all-content", {
        method: "POST",
        headers,
        body: JSON.stringify({
          course_id: String(course_id),
          folder_id: "0",
          limit: "100",
          page: "1"
        })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    // ═══════════════════════════════════════════════
    // TEST APIs
    // ═══════════════════════════════════════════════

    if (action === "test-list") {
      const { course_id, folder_id = "0" } = body;
      const r = await fetch("https://course.nexttoppers.com/course/all-content", {
        method: "POST",
        headers,
        body: JSON.stringify({
          course_id: String(course_id),
          folder_id: String(folder_id),
          limit: "1000",
          page: "1"
        })
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    if (action === "test-info") {
      const { test_id } = req.query;
      const r = await fetch(`https://test.nexttoppers.com/test/get-test-instructions?test_id=${test_id}`, {
        method: "GET",
        headers
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    if (action === "test-data") {
      const { test_id } = req.query;
      const r = await fetch(`https://test.nexttoppers.com/test/get-test-data?test_id=${test_id}`, {
        method: "GET",
        headers
      });
      const data = await r.json();
      res.status(200).json(data);
      return;
    }

    // ═══════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════

    if (action === "test") {
      res.status(200).json({ success: true, available: ["send-otp","verify-otp","course","content","video","live","test-list","test-info","test-data"] });
      return;
    }

  } catch (error) {
    console.error("[PROXY ERROR]", error);
    res.status(500).json({ error: error.message });
  }

  res.status(400).json({ 
    error: "Invalid action", 
    available: ["test","send-otp","verify-otp","course","content","video?content_id=123&course_id=123","live","test-list","test-info?test_id=123","test-data?test_id=123"]
  });
}
