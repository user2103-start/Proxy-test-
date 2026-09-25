// api/proxy.js

const AUTH_KEY = "appxapi";
const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE3OTcwNSIsInRpbWVzdGFtcCI6MTc3OTM1MTgyOSwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpFM09UY3dOU0lzSW1WdFlXbHNJam9pY0dGcVlYTnZaamt3TjBCdWNtbDZZUzVqYjIwaUxDSnVZVzFsSWpvaUlpd2lkR1Z1WVc1MFZIbHdaU0k2SW5WelpYSWlMQ0owWlc1aGJuUk9ZVzFsSWpvaWRtbGljbUZ1ZEdGallXUmxiWGxyYjNSaFgyUmlJaXdpZEdWdVlXNTBTV1FpT2lJaUxDSmthWE53YjNOaFlteGxJanBtWVd4elpYMC4zMnNkRnJfQWxxZnlBVXJNQXQxcDZVb0NlYmExbXk5RHV5NXNzUEJsRy1rIn0.eWIDpC7mnITnkLHIAwAsBidva87c1oIflglXHbEV_hQ";
const USER_ID = "179705";
const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in/get/course_contents_by_live_status";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { course_id = 1, start = -1, live_status = "1,2" } = req.query;

  try {
    const response = await fetch(
      `${BASE_URL}?course_id=${course_id}&start=${start}&live_status=${live_status}`,
      {
        method: "GET",
        headers: {
          "Accept": "/",
          "Auth-Key": AUTH_KEY,
          "Authorization": JWT_TOKEN,
          "Client-Service": "Appx",
          "Device-Type": "",
          "Origin": "https://www.vibrantacademy.com",
          "Referer": "https://www.vibrantacademy.com/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          "User-ID": USER_ID,
          "is-safari": "0",
          "save-data": "on",
          "source": "website",
          "user_app_category": "3"
        }
      }
    );

    const text = await response.text();
    const data = JSON.parse(text);
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
      }
