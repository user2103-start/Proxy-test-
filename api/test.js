export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Auth credentials (from authorized token)
  const AUTH_KEY = "appxapi";
  const JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjIxNzUyNyIsInRpbWVzdGFtcCI6MTc5MDM1MDM2NCwiaXZfdmVyIjoxLCJzZXNzaW9uIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBaQ0k2SWpJeE56VXlOeUlzSW1WdFlXbHNJam9pWTJGcllYUTNPRGt3TmtCdmJXRnVZWEowY3k1amIyMGlMQ0p1WVcxbElqb2lJaXdpZEdWdVlXNTBWSGx3WlNJNkluVnpaWElpTENKMFpXNWhiblJPWVcxbElqb2lkbWxpY21GdWRHRmpZV1JsYlhscmIzUmhYMlJpSWl3aWRHVnVZVzUwU1dRaU9pSWlMQ0prYVhOd2IzTmhZbXhsSWpwbVlXeHpaWDAucElueFpwYWpWRlZRWlNRVFRVVnREU1BFMDMydGhEVFg3QXV2MEt1YzdpbyJ9.sNPPYz9sGSpURYqXAEiRoKG24DVIRvtxU5HBb2oHRXM";
  const USER_ID = "217527";
  const BASE_URL = "https://vibrantacademykotaapi.akamai.net.in";

  const { endpoint, course_id, parent_id, video_id, recording_schedule, live_course_id, start = 0 } = req.query;

  let url;
  let method = "GET";
  let body = null;
  let contentType = "application/json";

  // Route requests to appropriate endpoints
  if (endpoint === "folders") {
    // Get course folder structure
    url = `${BASE_URL}/get/folder_contentsv3?course_id=${course_id}&parent_id=${parent_id}&start=${start}`;
  } 
  else if (endpoint === "video") {
    // Get video metadata and recording details
    url = `${BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=1&lc_app_api_url=`;
  } 
  else if (endpoint === "watch") {
    // Unlock video access (bypass purchase check)
    url = `${BASE_URL}/post/watch_videov2`;
    method = "POST";
    const lcId = live_course_id || course_id;
    body = `course_id=${course_id}&live_course_id=${lcId}&user_id=${USER_ID}&ytFlag=0&folder_wise_course=1`;
    contentType = "application/x-www-form-urlencoded;charset=utf-8";
  } 
  else if (endpoint === "playback") {
    // Direct CDN access for video playback
    url = `https://appx-content-v2.classx.co.in/hls/${recording_schedule}/playlist.m3u8`;
    method = "GET";
  }
  else if (endpoint === "presigned") {
    // Generate presigned URLs for video access
    url = `${BASE_URL}/post/generateTencentWebsitePresignedUrl`;
    method = "POST";
    body = JSON.stringify({
      filePath: `recordings/${recording_schedule}`,
      type: "video"
    });
  }
  else if (endpoint === "signed") {
    // Generate signed URL parameters
    const videoId = req.query.video_id;
    const quality = req.query.quality || "480p";
    const strtotime = req.query.strtotime;
    
    if (!videoId || !strtotime) {
      return res.status(400).json({ 
        error: "video_id and strtotime required",
        example: "?endpoint=signed&video_id=10336&strtotime=1790080200&quality=480p"
      });
    }

    // Construct the transcoded URL that needs signing
    const transcodedUrl = `https://appx-transcoded-videos.classx.co.in/videos/vibrantacademykota-data/${videoId}-${strtotime}/${quality}/master.m3u8`;
    
    // Return URL construction info (actual signing happens server-side)
    res.status(200).json({
      status: 200,
      video_id: videoId,
      quality: quality,
      transcoded_url: transcodedUrl,
      note: "URL ready for signing. Call /post/generateTencentWebsitePresignedUrl with filePath parameter for edge-cache-token"
    });
    return;
  }
    // First fetch video details, then extract and construct URLs
    const videoUrl = `${BASE_URL}/get/fetchVideoDetailsById?course_id=${course_id}&video_id=${video_id}&ytflag=0&folder_wise_course=1&lc_app_api_url=`;
    
    try {
      const videoResponse = await fetch(videoUrl, {
        method: "GET",
        headers: {
          "Auth-Key": AUTH_KEY,
          "Authorization": JWT_TOKEN,
          "Client-Service": "Appx",
          "User-ID": USER_ID,
          "Origin": "https://www.vibrantacademy.com",
          "source": "website"
        }
      });

      const videoData = await videoResponse.json();
      const video = videoData.data;

      // Extract all URL-related fields
      const extractedUrls = {
        video_id: video.id,
        title: video.Title,
        recording_schedule: video.recording_schedule,
        strtotime: video.strtotime,
        event_date: video.event_date,
        
        // Direct URLs from API (if any)
        api_urls: {
          recording_hls: video.recording_hls || "",
          download_url_higher_version: video.download_url_higher_version || "",
          download_url_lower_version: video.download_url_lower_version || "",
          video_player_url: video.video_player_url || "",
          embed_url: video.embed_url || "",
          download_link: video.download_link || "",
          download_link2: video.download_link2 || ""
        },
        
        // Arrays that might contain URLs
        arrays: {
          download_links: video.download_links || [],
          links: video.links || [],
          encrypted_links: video.encrypted_links || [],
          webdrm_links: video.webdrm_links || [],
          livestream_links: video.livestream_links || []
        },
        
        // Encryption/DRM info for decryption
        encryption: {
          dec_type: video.enc_type,
          decryption_key: video.decryption_key || "",
          video_key: video.video_key || "",
          drm_license_url: video.drm_license_url || "",
          drm_certificate_url: video.drm_certificate_url || ""
        },
        
        // Metadata for URL construction
        metadata: {
          media_id: video.media_id,
          free_flag: video.free_flag,
          is_purchased: video.is_purchased,
          course_id: video.course_id,
          strtotime: video.strtotime,
          iv_string: video.iv_string
        },
        
        // Constructed URLs based on patterns - Multiple Qualities (CORRECT SERVER)
        constructed_urls: {
          hls_direct: `https://appx-transcoded-videos.classx.co.in/videos/${video.id}-${video.strtotime}/hls/master.m3u8`,
          manual_hls: `https://appx-transcoded-videos.classx.co.in/manual4.m3u8`,
          transcoded_240p: `https://appx-transcoded-videos.classx.co.in/videos/vibrantacademykota-data/${video.id}-${video.strtotime}/240p/master.m3u8`,
          transcoded_360p: `https://appx-transcoded-videos.classx.co.in/videos/vibrantacademykota-data/${video.id}-${video.strtotime}/360p/master.m3u8`,
          transcoded_480p: `https://appx-transcoded-videos.classx.co.in/videos/vibrantacademykota-data/${video.id}-${video.strtotime}/480p/master.m3u8`,
          transcoded_720p: `https://appx-transcoded-videos.classx.co.in/videos/vibrantacademykota-data/${video.id}-${video.strtotime}/720p/master.m3u8`,
          transcoded_1080p: `https://appx-transcoded-videos.classx.co.in/videos/vibrantacademykota-data/${video.id}-${video.strtotime}/1080p/master.m3u8`
        }
      };

      res.status(200).json(extractedUrls);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }
  else if (endpoint === "stream") {
    // Direct transcoded video stream with edge cache token
    // Pattern: https://transcoded-videos.classx.co.in/videos/{course}/{video-id}-{timestamp}/{quality}/master-{id}.m3u8
    const quality = req.query.quality || "480p";
    const videoPath = req.query.videoPath; // Full transcoded path
    
    if (!videoPath) {
      return res.status(400).json({ 
        error: "videoPath parameter required",
        example: "?endpoint=stream&videoPath=vibrantacademykota-data/3442478-1774352796/480p/master-7551762.m3u8"
      });
    }
    
    url = `https://transcoded-videos.classx.co.in/videos/${videoPath}`;
    method = "GET";
  }
  else {
    return res.status(400).json({ 
      error: "Invalid endpoint",
      valid_endpoints: ["folders", "video", "watch", "playback", "presigned", "extract", "signed", "stream"]
    });
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Auth-Key": AUTH_KEY,
        "Authorization": JWT_TOKEN,
        "Client-Service": "Appx",
        "User-ID": USER_ID,
        "Origin": "https://www.vibrantacademy.com",
        "source": "website",
        ...(method === "POST" && { "Content-Type": contentType })
      },
      ...(body && { body })
    });

    // Handle both JSON and M3U8 responses
    const respContentType = response.headers.get("content-type");
    
    if (respContentType && respContentType.includes("application/json")) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else if (respContentType && respContentType.includes("text")) {
      const data = await response.text();
      res.setHeader("Content-Type", respContentType);
      res.status(response.status).end(data);
    } else {
      const data = await response.text();
      res.setHeader("Content-Type", "text/plain");
      res.status(response.status).end(data);
    }
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
                         }
