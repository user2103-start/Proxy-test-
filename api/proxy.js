const fetch = require('node-fetch');

const BASE_URL = 'https://api.thescholarverse.site';

module.exports = async (req, res) => {
  const { pathname } = req.url;
  const token = req.headers.authorization;

  console.log(`[Proxy] ${req.method} ${pathname}`);

  // ====================== LOGIN ======================
  if (pathname === '/api/login') {
    try {
      const body = req.body;
      console.log('[Login Request Body]', body);

      const response = await fetch(`${BASE_URL}/missionjeet/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      console.log('[Login Response]', data);

      return res.status(response.status).json(data);
    } catch (err) {
      console.error('[Login Error]', err);
      return res.status(500).json({ error: 'Login proxy failed', message: err.message });
    }
  }

  // ====================== CONTENT ======================
  if (pathname.startsWith('/api/content/')) {
    const courseId = pathname.split('/').pop();
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const batchId = urlParams.get('batch_id');

    try {
      const response = await fetch(
        `${BASE_URL}/missionjeet/course/content-details/${courseId}?batch_id=${batchId}`,
        { headers: { Authorization: token || '' } }
      );

      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Content proxy failed' });
    }
  }

  res.status(404).json({ error: 'Route not found' });
};
