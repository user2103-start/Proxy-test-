// VT/vibe.js - Course Content Proxy Server
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================
// BASE CONFIGURATION
// ============================================
const BASE_URL = 'https://smex.iownprince5.workers.dev';
const PDF_API = 'https://vibrant-live-api.lovable.app/api/v1/vibrant/pdf';
const PLAYER_API = 'https://studybeepro.site/proxy';

// Required headers for all requests
const DEFAULT_HEADERS = {
  'accept': '*/*',
  'auth-key': 'appxapi',
  'client-service': 'Appx',
  'origin': 'https://www.vibrantacademy.com',
  'referer': 'https://www.vibrantacademy.com/',
  'source': 'website',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// Helper function to make proxied requests
async function proxyRequest(url, method = 'GET', data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: { ...DEFAULT_HEADERS, ...headers },
      timeout: 30000
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Proxy request error:', error.message);
    throw error;
  }
}

// ============================================
// 1. ROOT COURSE - Get folder contents
// ============================================
app.get('/api/course/root', async (req, res) => {
  try {
    const { course_id } = req.query;
    
    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'course_id is required'
      });
    }
    
    const url = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=-1&start=0`;
    const data = await proxyRequest(url);
    
    res.json({
      success: true,
      data: data,
      course_id: course_id
    });
  } catch (error) {
    console.error('Root course error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 2. FOLDER CONTENT - Get folder contents
// ============================================
app.get('/api/course/folder', async (req, res) => {
  try {
    const { course_id, folder_id } = req.query;
    
    if (!course_id || !folder_id) {
      return res.status(400).json({
        success: false,
        error: 'course_id and folder_id are required'
      });
    }
    
    const url = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=${folder_id}&start=0`;
    const data = await proxyRequest(url);
    
    res.json({
      success: true,
      data: data,
      course_id: course_id,
      folder_id: folder_id
    });
  } catch (error) {
    console.error('Folder content error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 3. LIVE CLASSES - Get live class contents
// ============================================
app.get('/api/course/live', async (req, res) => {
  try {
    const { course_id } = req.query;
    
    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'course_id is required'
      });
    }
    
    const url = `${BASE_URL}/get/course_contents_by_live_status?course_id=${course_id}&start=0`;
    const data = await proxyRequest(url);
    
    res.json({
      success: true,
      data: data,
      course_id: course_id,
      type: 'live_classes'
    });
  } catch (error) {
    console.error('Live classes error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 4. PREVIOUS LIVE CLASSES
// ============================================
app.get('/api/course/previous-live', async (req, res) => {
  try {
    const { course_id } = req.query;
    
    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'course_id is required'
      });
    }
    
    const url = `${BASE_URL}/get/get_previous_live_videos?course_id=${course_id}&start=0&folder_wise_course=1`;
    const data = await proxyRequest(url);
    
    res.json({
      success: true,
      data: data,
      course_id: course_id,
      type: 'previous_live_classes'
    });
  } catch (error) {
    console.error('Previous live classes error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 5. VIDEO API
// ============================================
app.get('/api/video', async (req, res) => {
  try {
    const { video_id, course_id } = req.query;
    
    if (!video_id || !course_id) {
      return res.status(400).json({
        success: false,
        error: 'video_id and course_id are required'
      });
    }
    
    const url = `${BASE_URL}/?video_id=${video_id}&course_id=${course_id}`;
    const data = await proxyRequest(url);
    
    res.json({
      success: true,
      data: data,
      video_id: video_id,
      course_id: course_id
    });
  } catch (error) {
    console.error('Video API error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 6. PLAYER API - Get proxied video URL
// ============================================
app.get('/api/player', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'url parameter is required'
      });
    }
    
    const playerUrl = `${PLAYER_API}?url=${encodeURIComponent(url)}`;
    const data = await proxyRequest(playerUrl);
    
    res.json({
      success: true,
      data: data,
      original_url: url
    });
  } catch (error) {
    console.error('Player API error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 7. PDF API - Get PDF content
// ============================================
app.get('/api/pdf', async (req, res) => {
  try {
    const { pdf_id, course_id, parent_id } = req.query;
    
    if (!pdf_id || !course_id || !parent_id) {
      return res.status(400).json({
        success: false,
        error: 'pdf_id, course_id, and parent_id are required'
      });
    }
    
    const url = `${PDF_API}?pdf_id=${pdf_id}&material_type=pdf&course_id=${course_id}&parent_id=${parent_id}`;
    const data = await proxyRequest(url);
    
    res.json({
      success: true,
      data: data,
      pdf_id: pdf_id,
      course_id: course_id,
      parent_id: parent_id
    });
  } catch (error) {
    console.error('PDF API error:', error.message);
    res.status(error.response?.status || 500).json({
