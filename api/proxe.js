export default async function handler(req, res) {
  const { video_id } = req.query;

  if (!video_id) {
    return res.status(400).json({
      error: "video_id required"
    });
  }

  try {
    const response = await fetch(
      `https://vibrantacademykotaapi.akamai.net.in/get/fetchVideoDetailsById?video_id=${encodeURIComponent(video_id)}`,
      {
        headers: {
          accept: "*/*",
          "auth-key": "appxapi",
          "client-service": "Appx",
          origin: "https://www.vibrantacademy.com",
          referer: "https://www.vibrantacademy.com/",
          source: "website"
        }
      }
    );

    const data = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/json"
    );

    return res.status(response.status).send(data);
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
