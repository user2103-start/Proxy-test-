// proxy.js - Course Content Proxy Server
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
      timeout: 30000 // 30 second timeout
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
// GET /api/course/root?course_id=XXX
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
// GET /api/course/folder?course_id=XXX&folder_id=XXX
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
// GET /api/course/live?course_id=XXX
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
// GET /api/course/previous-live?course_id=XXX
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
// GET /api/video?video_id=XXX&course_id=XXX
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
// GET /api/player?url=ENCODED_URL
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
// GET /api/pdf?pdf_id=XXX&course_id=XXX&parent_id=XXX
app.get('/api/pdf', async (req, res) => {
  try {
    const { pdf_id, course_id, parent_id } = req.query;
    
    if (!pdf_id || !course_id || !parent_id) {
      return res.status(400).json({
        success: false,
        error: 'pdf_id, course_id, and parent_id are required'
      });
    }
    
    // material_type=pdf is fixed as per the API spec
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
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 8. PDF ONLINE VIEWER - Get viewer URL
// ============================================
// GET /api/pdf/viewer?pdf_url=ENCODED_PDF_URL
app.get('/api/pdf/viewer', async (req, res) => {
  try {
    const { pdf_url } = req.query;
    
    if (!pdf_url) {
      return res.status(400).json({
        success: false,
        error: 'pdf_url is required'
      });
    }
    
    const viewerUrl = `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(pdf_url)}`;
    
    res.json({
      success: true,
      viewer_url: viewerUrl,
      pdf_url: pdf_url
    });
  } catch (error) {
    console.error('PDF viewer error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 9. PDF DOWNLOAD - Get download URL
// ============================================
// GET /api/pdf/download?pdf_url=PDF_URL
app.get('/api/pdf/download', async (req, res) => {
  try {
    const { pdf_url } = req.query;
    
    if (!pdf_url) {
      return res.status(400).json({
        success: false,
        error: 'pdf_url is required'
      });
    }
    
    const downloadUrl = `https://pdf-appx.edumate.life/?url=${encodeURIComponent(pdf_url)}`;
    
    res.json({
      success: true,
      download_url: downloadUrl,
      pdf_url: pdf_url
    });
  } catch (error) {
    console.error('PDF download error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 10. BATCH COURSE API - Get course details
// ============================================
// GET /api/batch/:id - Get batch details with course ID
app.get('/api/batch/:id', async (req, res) => {
  try {
    const batchId = req.params.id;
    
    // You might have a mapping of batch IDs to course IDs
    // For now, we'll just return the batch info
    const batchMap = {
      8: { course_id: 8, title: "JEE 2028: 11th Class OG KOTA BATCH" },
      10: { course_id: 10, title: "JEE 2027: 12th Class OG KOTA Batch" },
      35: { course_id: 35, title: "JEE 2028: 11th Class P2 Batch" },
      36: { course_id: 36, title: "JEE 2027: 12th Class A2 Batch" },
      7: { course_id: 7, title: "Free Resources" }
    };
    
    const batch = batchMap[batchId];
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: parseInt(batchId),
        ...batch
      }
    });
  } catch (error) {
    console.error('Batch API error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 11. BATCH COURSE CONTENTS - Get all content for a batch
// ============================================
// GET /api/batch/:id/contents
app.get('/api/batch/:id/contents', async (req, res) => {
  try {
    const batchId = req.params.id;
    
    // Map batch ID to course ID
    const courseMap = {
      8: 8,
      10: 10,
      35: 35,
      36: 36,
      7: 7
    };
    
    const course_id = courseMap[batchId];
    
    if (!course_id) {
      return res.status(404).json({
        success: false,
        error: 'Course not found for this batch'
      });
    }
    
    // Fetch root contents for this course
    const rootUrl = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=-1&start=0`;
    const rootData = await proxyRequest(rootUrl);
    
    res.json({
      success: true,
      data: {
        batch_id: parseInt(batchId),
        course_id: course_id,
        contents: rootData
      }
    });
  } catch (error) {
    console.error('Batch contents error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// 12. HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      root_course: '/api/course/root?course_id=XXX',
      folder: '/api/course/folder?course_id=XXX&folder_id=XXX',
      live: '/api/course/live?course_id=XXX',
      previous_live: '/api/course/previous-live?course_id=XXX',
      video: '/api/video?video_id=XXX&course_id=XXX',
      player: '/api/player?url=ENCODED_URL',
      pdf: '/api/pdf?pdf_id=XXX&course_id=XXX&parent_id=XXX',
      pdf_viewer: '/api/pdf/viewer?pdf_url=PDF_URL',
      pdf_download: '/api/pdf/download?pdf_url=PDF_URL',
      batch: '/api/batch/:id',
      batch_contents: '/api/batch/:id/contents'
    }
  });
});

// ============================================
// 13. ERROR HANDLING
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Course Proxy Server running on http://localhost:${PORT}`);
  console.log(`\n📚 Available Endpoints:`);
  console.log(`   GET  /api/course/root?course_id=XXX`);
  console.log(`   GET  /api/course/folder?course_id=XXX&folder_id=XXX`);
  console.log(`   GET  /api/course/live?course_id=XXX`);
  console.log(`   GET  /api/course/previous-live?course_id=XXX`);
  console.log(`   GET  /api/video?video_id=XXX&course_id=XXX`);
  console.log(`   GET  /api/player?url=ENCODED_URL`);
  console.log(`   GET  /api/pdf?pdf_id=XXX&course_id=XXX&parent_id=XXX`);
  console.log(`   GET  /api/pdf/viewer?pdf_url=PDF_URL`);
  console.log(`   GET  /api/pdf/download?pdf_url=PDF_URL`);
  console.log(`   GET  /api/batch/:id`);
  console.log(`   GET  /api/batch/:id/contents`);
  console.log(`   GET  /api/health`);
});
