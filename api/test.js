export default async function handler(req, res) {
  const { type } = req.query;

  const headers = {
    "accept": "*/*",
    "auth-key": "appxapi",
    "client-service": "Appx",
    "origin": "https://www.vibrantacademy.com",
    "referer": "https://www.vibrantacademy.com/",
    "source": "website"
  };

  let url = "";

  if (type === "video") {
    url = "https://vibrantacademykotaapi.akamai.net.in/get/fetchVideoDetailsById?course_id=7&video_id=4809&ytflag=0&folder_wise_course=1&lc_app_api_url=";
  } else if (type === "parent") {
    url = "https://vibrantacademykotaapi.akamai.net.in/get/parent_folder_contents?course_id=7&current_folder_id=4804";
  } else if (type === "folder") {
    url = "https://vibrantacademykotaapi.akamai.net.in/get/folder_contentsv3?course_id=7&parent_id=4803&start=0";
  } else {
    return res.status(400).json({ error: "Invalid type" });
  }

  const response = await fetch(url, { headers });
  const data = await response.json();

  return res.status(200).json(data);
}
