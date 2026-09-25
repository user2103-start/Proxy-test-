// api/proxy.js

const AUTH_KEY = "appxapi";
const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE4NjYwOCIsInRpbWVzdGFtcCI6MTc4MDIxMjQ1OSwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpFNE5qWXdPQ0lzSW1WdFlXbHNJam9pWjJGeVlXeHBlREV4TVVCcFptTnZZWFF1WTI5dElpd2libUZ0WlNJNklpSXNJblJsYm1GdWRGUjVjR1VpT2lKMWMyVnlJaXdpZEdWdVlXNTBUbUZ0WlNJNkluWnBZbkpoYm5SaFkyRmtaVzE1YTI5MFlWOWtZaUlzSW5SbGJtRnVkRWxrSWpvaUlpd2laR2x6Y0c5ellXSnNaU0k2Wm1Gc2MyVjkuWnhUczRIckotOGwxeWE5WnpkNEdLS3dkbFkxSVJ1WDBPYzJnRFE3bUEyMCJ9.OjTJvVHdQJadu5AXAy-rn1NzT-ZGPP5ckDPkW3V1RYo";
const USER_ID = "186608";
const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in/get";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { endpoint = "folder_contentsv3", course_id = 37, parent_id = -1, start = 0 } = req.query;

  try {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append("course_id", course_id);
    url.searchParams.append("parent_id", parent_id);
    url.searchParams.append("start", start);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Auth-Key": AUTH_KEY,
        "Authorization": JWT_TOKEN,
        "Client-Service": "Appx",
        "User-ID": USER_ID,
        "Origin": "https://www.vibrantacademy.com",
        "source": "website"
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
