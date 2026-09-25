// ============================================
// VIBRANT ACADEMY PROXY API - VERCEL READY
// ============================================

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const CONFIG = {
  BASE_URL: 'https://vibrantacademykotaapi.akamai.net.in',
  AUTH_KEY: 'appxapi',
  JWT_TOKEN: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjE3OTcwNSIsInRpbWVzdGFtcCI6MTc3OTM1MTgyOSwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpFM09UY3dOU0lzSW1WdFlXbHNJam9pY0dGcVlYTnZaemt3TjBCdWNtbDZZUzVqYjIwaUxDSnVZVzFsSWpvaUlpd2lkR1Z1WVc1MFZIbHdaU0k2SW5WelpYSWlMQ0owWlc1aGJuUk9ZVzFsSWpvaWRtbGljbUZ1ZEdGallXUmxiWGxyYjNSaFgyUmlJaXdpZEdWdVlXNTBTV1FpT2lJaUxDSmthWE53YjNOaFlteGxJanBtWVd4elpYMC4zMnNkRnJfQWxxZnlBVXJNQXQxcDZVb0NlYmExbXk5RHV5NXNzUEJsRy1rIn0.eWIDpC7mnITnkLHIAwAsBidva87c1oIflglXHbEV_hQ',
  USER_ID: '179705'
};

const app = express();
app.use(cors());
app.use(express.json());

const getHeaders = () => ({
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
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🚀 Vibrant Academy Proxy API chal rahi hai',
    time: new Date().toISOString()
  });
});

// Course Contents
app.get('/api/course-contents', async (req, res) => {
  try {
    const { course_id, start = '-1', live_status = '1,2' } = req.query;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'course_id query parameter required hai'
      });
    }

    const url = `${CONFIG.BASE_URL}/get/course_contents_by_live_status`;

    const response = await axios.get(url, {
      params: { course_id, start, live_status },
      headers: getHeaders(),
      timeout: 25000,
      validateStatus: () => true
    });

    return res.status(response.status).json({
      success: response.status === 200,
      data: response.data
    });

  } catch (error) {
    console.error('[ERROR]', error.message, error.stack);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      hint: error.code === 'ENOTFOUND' ? 'DNS issue' :
            error.code === 'ETIMEDOUT' ? 'Timeout - server slow' :
            error.code === 'ECONNREFUSED' ? 'Connection refused' : 'Check Vercel logs'
    });
  }
});

// Generic Proxy
app.get('/api/proxy/*', async (req, res) => {
  try {
    const path = req.params[0];
    const url = `${CONFIG.BASE_URL}/${path}`;

    const response = await axios.get(url, {
      params: req.query,
      headers: getHeaders(),
      timeout: 25000,
      validateStatus: () => true
    });

    return res.status(response.status).json({
      success: response.status === 200,
      data: response.data
    });

  } catch (error) {
    console.error('[ERROR]', error.message, error.stack);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// Vercel handler
module.exports = app;
