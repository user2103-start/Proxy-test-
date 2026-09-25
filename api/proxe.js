export default async function handler(req, res) {
  const { video_id, user_id, device_id, token } = req.query;

  if (!video_id) {
    return res.status(400).json({ error: "video_id required" });
  }

  const target =
    `https://vibrantacademykotaapi.akamai.net.in/get/fetchVideoDetailsById` +
    `?video_id=${encodeURIComponent(video_id)}`;

  const headers = {
    accept: "*/*",
    "auth-key": "appxapi",
    "client-service": "Appx",
    origin: "https://www.vibrantacademy.com",
    referer: "https://www.vibrantacademy.com/",
    source: "website"
  };

  // Only forward credentials you are authorized to test.
  if (user_id) headers["user-id"] = user_id;
  if (device_id) headers["device-id"] = device_id;
  if (token) headers["token"] = token;

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers
    });

    const body = await upstream.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json"
    );

    return res.status(upstream.status).send(body);
  } catch (err) {
    return res.status(502).json({
      error: "Upstream request failed",
      details: err.message
    });
  }
}
