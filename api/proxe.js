// ============================================
// VIBRANT ACADEMY PROXY - api/proxe.js
// No dependencies, pure Node.js
// ============================================

const CONFIG = {
  BASE_URL: 'https://vibrantacademykotaapi.akamai.net.in',
  AUTH_KEY: 'appxapi',
  JWT_TOKEN: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE3OTcwNSIsInRpbWVzdGFtcCI6MTc3OTM1MTgyOSwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpFM09UY3dOU0lzSW1WdFlXbHNJam9pY0dGcVlYTnZaemt3TjBCdWNtbDZZUzVqYjIwaUxDSnVZVzFsSWpvaUlpd2lkR1Z1WVc1MFZIbHdaU0k2SW5WelpYSWlMQ0owWlc1aGJuUk9ZVzFsSWpvaWRtbGljbUZ1ZEdGallXUmxiWGxyYjNSaFgyUmlJaXdpZEdWdVlXNTBTV1FpT2lJaUxDSmthWE53YjNOaFlteGxJanBtWVd4elpYMC4zMnNkRnJfQWxxZnlBVXJNQXQxcDZVb0NlYmExbXk5RHV5NXNzUEJsRy1rIn0.eWIDpC7mnITnkLHIAwAsBidva87c1oIflglXHbEV_hQ',
  USER_ID: '179705'
};

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Auth-Key': CONFIG.AUTH_KEY,
  'Authorization': CONFIG.JWT_TOKEN,
  'Client-Service': 'Appx',
  'Origin': 'https://www.vibrantacademy.com',
  'Referer': 'https://www.vibrantacademy.com/',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'User-ID': CONFIG.USER_ID,
  'is-safari': '0',
  'save-data': 'on',
  'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'source': 'website',
  'user_app_category': '3'
};

module.exports = async (req, res) => {
  // CORS headers manually
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // URL se path aur query nikalo
    const fullUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = fullUrl.pathname.replace(/^\/api\/proxe/, '') || '/';
    const query = fullUrl.search;

    // Agar path empty hai toh health check
    if (path === '/' || path === '') {
      res.status(200).json({
        status: 'ok',
        message: '🚀 Proxy chal rahi hai',
        usage: '/api/proxe/get/course_contents_by_live_status?course_id=123&start=-1&live_status=1,2'
      });
      return;
    }

    // Original API ka URL banao
    const targetUrl = `${CONFIG.BASE_URL}${path}${query}`;

    // Fetch karo (Node 18+ mein native hai)
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: HEADERS
    });

    const data = await response.text();

    res.status(response.status);
    res.send(data);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check Vercel logs for details'
    });
  }
};
