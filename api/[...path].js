// api/proxy.js
// Fallback for any API calls that need dynamic handling
// Main proxying is done via vercel.json rewrites (faster)
// This handles OPTIONS preflight and any custom logic

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id');
    return res.status(200).end();
  }

  // Extract the target path from the query
  // Usage: /api/proxy?target=/missionjeet/auth/check-user&mobile=...&device_id=...
  const target = req.query.target;
  
  if (!target) {
    return res.status(400).json({ error: 'Missing target parameter' });
  }

  const baseUrl = 'https://api.thescholarverse.site';
  const url = `${baseUrl}${target}${req.url.includes('?') ? '&' + req.url.split('?').slice(1).join('?') : ''}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
        ...(req.headers['x-device-id'] ? { 'x-device-id': req.headers['x-device-id'] } : {})
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: 'Proxy error', message: error.message });
  }
}
