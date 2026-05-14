const BASE_URL = 'https://api.thescholarverse.site';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const pathname = url.pathname;

    const query = Object.fromEntries(url.searchParams);

    console.log(`[Proxy] ${req.method} ${pathname}`);

    // ====================== CHECK USER ======================
    if (pathname === '/api/check-user') {
      const {
        mobile,
        device_id = 'xyz'
      } = query;

      if (!mobile) {
        return res.status(400).json({
          error: 'Mobile number required',
        });
      }

      const response = await fetch(
        `${BASE_URL}/missionjeet/auth/check-user?mobile=${mobile}&device_id=${device_id}`
      );

      const data = await response.json();

      return res.status(200).json(data);
    }

    // ====================== VERIFY OTP ======================
    if (pathname === '/api/verify-otp') {
      const {
        mobile,
        otp,
        device_id = 'xyz',
        name = 'Guest'
      } = query;

      if (!mobile || !otp) {
        return res.status(400).json({
          error: 'Mobile and OTP required',
        });
      }

      const response = await fetch(
        `${BASE_URL}/missionjeet/auth/verify-otp?mobile=${mobile}&otp=${otp}&device_id=${device_id}&name=${encodeURIComponent(name)}`
      );

      const data = await response.json();

      return res.status(200).json(data);
    }

    // ====================== CONTENT DETAILS ======================
    if (pathname.startsWith('/api/content/')) {
      const courseId = pathname.split('/').pop();

      const batchId = query.batch_id || 1;

      const token = req.headers.authorization || '';

      const response = await fetch(
        `${BASE_URL}/missionjeet/course/content-details/${courseId}?batch_id=${batchId}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const data = await response.json();

      return res.status(200).json(data);
    }

    // ====================== 404 ======================
    return res.status(404).json({
      error: 'Route not found',
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
}
