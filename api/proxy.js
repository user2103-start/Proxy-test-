const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ================= CONFIG =================
const DELTA = "https://deltaserver.vercel.app/api/pw";
const COURSE = "https://course.nexttoppers.com";
const TEST = "https://test.nexttoppers.com";

// ================= HELPERS =================
function auth(req) {
  return req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
}

// ================= AUTH =================

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { phoneNumber, username } = req.body;

    const { data } = await axios.post(`${DELTA}/login`, {
      phoneNumber,
      username,
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// VERIFY OTP
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { phoneNumber, username, otp } = req.body;

    const { data } = await axios.post(`${DELTA}/verify`, {
      phoneNumber,
      username,
      otp,
    });

    if (data.accessToken) {
      res.cookie("token", data.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= COURSE APIs =================

// COURSE DETAILS
app.post("/api/course/details", async (req, res) => {
  try {
    const token = auth(req);

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

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ALL CONTENT
app.post("/api/course/content", async (req, res) => {
  try {
    const token = auth(req);

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

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CONTENT DETAILS
app.get("/api/course/content-details", async (req, res) => {
  try {
    const token = auth(req);

    const { content_id, course_id } = req.query;

    const { data } = await axios.get(
      `${COURSE}/course/content-details`,
      {
        params: { content_id, course_id },
        headers: {
          app_id: "1772100600",
          authorization: `Bearer ${token}`,
          platform: "3",
          version: "1",
        },
      }
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= TEST APIs =================

// TEST INSTRUCTIONS
app.get("/api/test/instructions/:id", async (req, res) => {
  try {
    const token = auth(req);

    const { data } = await axios.get(
      `${TEST}/test/get-test-instructions`,
      {
        params: { test_id: req.params.id },
        headers: {
          app_id: "1772100600",
          authorization: `Bearer ${token}`,
          platform: "3",
          version: "1",
          user_id: "4071072",
        },
      }
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// TEST DATA
app.get("/api/test/data/:id", async (req, res) => {
  try {
    const token = auth(req);

    const { data } = await axios.get(
      `${TEST}/test/get-test-data`,
      {
        params: { test_id: req.params.id },
        headers: {
          app_id: "1772100600",
          authorization: `Bearer ${token}`,
          platform: "3",
          version: "1",
          user_id: "4071072",
        },
      }
    );

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

module.exports = app;
