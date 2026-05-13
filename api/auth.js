import axios from "axios";

const DELTA = "https://deltaserver.vercel.app/api/pw";

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    // LOGIN
    if (action === "login") {
      const { phoneNumber } = req.body;

      const { data } = await axios.post(`${DELTA}/login`, {
        phoneNumber,
        username: phoneNumber,
      });

      return res.json(data);
    }

    // VERIFY
    if (action === "verify") {
      const { phoneNumber, otp } = req.body;

      const { data } = await axios.post(`${DELTA}/verify`, {
        phoneNumber,
        username: phoneNumber,
        otp,
      });

      return res.json(data);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
