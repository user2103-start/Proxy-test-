const NT = "https://course.nexttoppers.com";
const AUTH = "https://auth.nexttoppers.com";

const APP_ID = "1772100600";
const DEVICE_ID = "ae2fa506-85ca-418d-a449-ec5068dc6665";

// fallback (only if no login)
const FALLBACK_TOKEN = "Bearer YOUR_FALLBACK_TOKEN";
const FALLBACK_USER_ID = "3245033";

function headers(token, userId) {
  return {
    accept: "application/json, text/plain, */*",
    app_id: APP_ID,
    authorization: token,
    content-type: "application/json",
    origin: "https://missionjeet.in",
    referer: "https://missionjeet.in/",
    platform: "3",
    user_id: userId,
    "user-agent": "Mozilla/5.0",
    version: "1"
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;
  const body = req.body || {};

  // ---------------- AUTH STEP ----------------

  // Send OTP
  if (action === "sendotp") {
    const r = await fetch(`${AUTH}/auth/send-otp`, {
      method: "POST",
      headers: headers("", ""),
      body: JSON.stringify({
        mobile: body.mobile,
        device_id: DEVICE_ID
      })
    });
    return res.json(await r.json());
  }

  // Verify OTP
  if (action === "verifyotp") {
    const r = await fetch(`${AUTH}/auth/verify-otp`, {
      method: "POST",
      headers: headers("", ""),
      body: JSON.stringify({
        mobile: body.mobile,
        otp: body.otp,
        device_id: DEVICE_ID
      })
    });

    const data = await r.json();

    return res.json({
      success: data.success,
      token: data.data?.token || null,
      user_id: data.data?.user_id || null,
      raw: data
    });
  }

  // ---------------- COURSE API ----------------

  if (action === "course") {
    const r = await fetch(`${NT}/course/course-details`, {
      method: "POST",
      headers: headers(
        req.headers["x-token"] || FALLBACK_TOKEN,
        req.headers["x-user"] || FALLBACK_USER_ID
      ),
      body: JSON.stringify({
        course_id: body.course_id,
        parent_id: "0"
      })
    });

    return res.json(await r.json());
  }

  // ---------------- CONTENT API ----------------

  if (action === "content") {
    const r = await fetch(`${NT}/course/all-content`, {
      method: "POST",
      headers: headers(
        req.headers["x-token"] || FALLBACK_TOKEN,
        req.headers["x-user"] || FALLBACK_USER_ID
      ),
      body: JSON.stringify({
        course_id: body.course_id,
        folder_id: body.folder_id || "0",
        limit: "1000",
        page: "1",
        parent_course_id: body.parent_course_id || "0"
      })
    });

    return res.json(await r.json());
  }

  // ---------------- VIDEO API ----------------

  if (action === "video") {
    const { content_id, course_id } = req.query;

    const r = await fetch(
      `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
      {
        method: "GET",
        headers: headers(
          req.headers["x-token"] || FALLBACK_TOKEN,
          req.headers["x-user"] || FALLBACK_USER_ID
        )
      }
    );

    return res.json(await r.json());
  }

  return res.status(400).json({ error: "Invalid action" });
}
