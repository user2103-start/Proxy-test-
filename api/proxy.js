const fetch = require('node-fetch');

const BASE_URL = 'https://api.thescholarverse.site';

module.exports = async (req, res) => {
  const { pathname } = req.url;
  const token = req.headers.authorization;

  // ====================== LOGIN API ======================
  if (pathname === '/api/login') {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Login proxy failed' });
    }
  }

  // ====================== CONTENT API ======================
  if (pathname.startsWith('/api/content/')) {
    const courseId = pathname.split('/').pop();
    const batchId = new URLSearchParams(req.url.split('?')[1] || '').get('batch_id');

    try {
      const response = await fetch(
        `${BASE_URL}/missionjeet/course/content-details/${courseId}?batch_id=${batchId}`,
        {
          headers: { Authorization: token || '' }
        }
      );

      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Content proxy failed' });
    }
  }

  res.status(404).json({ error: 'Route not found' });
};
