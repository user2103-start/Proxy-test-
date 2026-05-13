import axios from "axios";

const COURSE = "https://course.nexttoppers.com";

export default async function handler(req, res) {
  const { action } = req.query;
  const token = req.headers.authorization?.replace("Bearer ", "");

  try {
    // DETAILS
    if (action === "details") {
      const { data } = await axios.post(
        `${COURSE}/course/course-details`,
        req.body,
        {
          headers: {
            app_id: "1772100600",
            authorization: `Bearer ${token}`,
            platform: "3",
            version: "1",
            user_id: "3186295",
          },
        }
      );

      return res.json(data);
    }

    // CONTENT
    if (action === "content") {
      const { data } = await axios.post(
        `${COURSE}/course/all-content`,
        req.body,
        {
          headers: {
            app_id: "1772100600",
            authorization: `Bearer ${token}`,
            platform: "3",
            version: "1",
            user_id: "3186295",
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
