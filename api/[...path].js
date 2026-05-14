const fetch = require('node-fetch');

const BASE_URL = 'https://api.thescholarverse.site';

module.exports = async (req, res) => {
  const { pathname, query } = req;
  const method = req.method;

  console.log(`[Proxy] ${method} ${pathname}`);

  // ====================== SEND OTP / CHECK USER ======================
  if (pathname === '/api/check-user') {
    const { mobile } = query;
    if (!mobile) return res.status(400).json({ error: "Mobile number required" });

    try {
      const response = await fetch(`${BASE_URL}/missionjeet/auth/check-user?mobile=${mobile}&device_id=xyz`);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: "Failed to send OTP" });
    }
  }

  // ====================== VERIFY OTP ======================
  if (pathname === '/api/verify-otp') {
    const { mobile, otp, name = "Guest" } = query;
    if (!mobile || !otp) return res.status(400).json({ error: "Mobile and OTP required" });

    try {
      const response = await fetch(
        `${BASE_URL}/missionjeet/auth/verify-otp?mobile=${mobile}&otp=${otp}&device_id=xyz&name=${encodeURIComponent(name)}`
      );
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: "Verification failed" });
    }
  }

  // ====================== CONTENT DETAILS ======================
  if (pathname.startsWith('/api/content/')) {
    const courseId = pathname.split('/').pop();
    const batchId = query.batch_id || 1;
    const token = req.headers.authorization;

    try {
      const response = await fetch(
        `${BASE_URL}/missionjeet/course/content-details/${courseId}?batch_id=${batchId}`,
        { headers: { Authorization: token || '' } }
      );
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch content" });
    }
  }

  res.status(404).json({ error: "Route not found" });
};
