import axios from "axios";

const TEST = "https://test.nexttoppers.com";

export default async function handler(req, res) {
  const { action, id } = req.query;
  const token = req.headers.authorization?.replace("Bearer ", "");

  try {
    if (action === "instructions") {
      const { data } = await axios.get(
        `${TEST}/test/get-test-instructions`,
        {
          params: { test_id: id },
          headers: {
            app_id: "1772100600",
            authorization: `Bearer ${token}`,
            platform: "3",
            version: "1",
            user_id: "4071072",
          },
        }
      );

      return res.json(data);
    }

    if (action === "data") {
      const { data } = await axios.get(
        `${TEST}/test/get-test-data`,
        {
          params: { test_id: id },
          headers: {
            app_id: "1772100600",
            authorization: `Bearer ${token}`,
            platform: "3",
            version: "1",
            user_id: "4071072",
          },
        }
      );

      return res.json(data);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
