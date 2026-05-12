const NT = "https://course.nexttoppers.com";

const APP_ID = "1772100600";
const FALLBACK_TOKEN = "Bearer YOUR_TOKEN_HERE";
const FALLBACK_USER_ID = "3245033";

function headers(token, userId) {
  return {
    accept: "application/json, text/plain, */*",
    app_id: APP_ID,
    authorization: token || FALLBACK_TOKEN,
    user_id: userId || FALLBACK_USER_ID,
    "content-type": "application/json",
    origin: "https://missionjeet.in",
    referer: "https://missionjeet.in/",
    platform: "3",
    version: "1"
  };
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") return res.status(200).end();

    const { action } = req.query;
    const body = req.body || {};

    // 🧪 TEST ROUTE (check server alive)
    if (!action) {
      return res.status(200).json({
        success: true,
        message: "Proxy is running"
      });
    }

    // 📦 COURSE DETAILS
    if (action === "course") {
      const r = await fetch(`${NT}/course/course-details`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          course_id: body.course_id,
          parent_id: "0"
        })
      });

      return res.status(200).json(await r.json());
    }

    // 📁 CONTENT
    if (action === "content") {
      const r = await fetch(`${NT}/course/all-content`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          course_id: body.course_id,
          folder_id: body.folder_id || "0",
          limit: "1000",
          page: "1",
          parent_course_id: body.parent_course_id || "0"
        })
      });

      return res.status(200).json(await r.json());
    }

    // 🎥 VIDEO
    if (action === "video") {
      const { content_id, course_id } = req.query;

      const r = await fetch(
        `${NT}/course/content-details?content_id=${content_id}&course_id=${course_id}`,
        {
          method: "GET",
          headers: headers()
        }
      );

      return res.status(200).json(await r.json());
    }

    return res.status(400).json({
      success: false,
      error: "Invalid action"
    });

  } catch (err) {
    console.error("PROXY ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
