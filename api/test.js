export default async function handler(req, res) {
  try {
    const { type } = req.query;

    const headers = {
      "accept": "*/*",
      "auth-key": "appxapi",
      "client-service": "Appx",
      "origin": "https://www.vibrantacademy.com",
      "referer": "https://www.vibrantacademy.com/",
      "source": "website"
    };

    let url;

    switch (type) {
      case "video": {
        const { course_id, video_id } = req.query;

        if (!course_id || !video_id) {
          return res.status(400).json({
            error: "course_id and video_id required"
          });
        }

        url =
          `https://vibrantacademykotaapi.akamai.net.in/get/fetchVideoDetailsById` +
          `?course_id=${encodeURIComponent(course_id)}` +
          `&video_id=${encodeURIComponent(video_id)}` +
          `&ytflag=0&folder_wise_course=1&lc_app_api_url=`;
        break;
      }

      case "parent": {
        const { course_id, current_folder_id } = req.query;

        if (!course_id || !current_folder_id) {
          return res.status(400).json({
            error: "course_id and current_folder_id required"
          });
        }

        url =
          `https://vibrantacademykotaapi.akamai.net.in/get/parent_folder_contents` +
          `?course_id=${encodeURIComponent(course_id)}` +
          `&current_folder_id=${encodeURIComponent(current_folder_id)}`;
        break;
      }

      case "folder": {
        const { course_id, parent_id, start = 0 } = req.query;

        if (!course_id || !parent_id) {
          return res.status(400).json({
            error: "course_id and parent_id required"
          });
        }

        url =
          `https://vibrantacademykotaapi.akamai.net.in/get/folder_contentsv3` +
          `?course_id=${encodeURIComponent(course_id)}` +
          `&parent_id=${encodeURIComponent(parent_id)}` +
          `&start=${encodeURIComponent(start)}`;
        break;
      }

      case "freecontent": {
        const { courseid, start = 0 } = req.query;

        if (!courseid) {
          return res.status(400).json({
            error: "courseid required"
          });
        }

        url =
          `https://vibrantacademykotaapi.akamai.net.in/get/course_class_freecontentv2` +
          `?courseid=${encodeURIComponent(courseid)}` +
          `&start=${encodeURIComponent(start)}` +
          `&folder_wise_course=1`;
        break;
      }

      default:
        return res.status(400).json({
          error: "Invalid type"
        });
    }

    const response = await fetch(url, {
      method: "GET",
      headers
    });

    const text = await response.text();

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/json"
    );

    return res.status(response.status).send(text);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
