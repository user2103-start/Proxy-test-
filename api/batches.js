// File: api/batches.js
// ✅ CORS Enabled for ALL origins

const courses = [
  {
    id: 184,
    title: "Drona 2.0 NEET Class 11th",
    thumbnail: "https://dulae92u7241v.cloudfront.net/1772100600/admin_v2/uploads/courses/thumbnail/241318_131_drona%202.0%20NEET%20banner%20app.png",
    offer_price: "4999.00",
    mrp: "",
    start_date: "1772821801",
    end_date: "1843410599"
  },
  {
    id: 185,
    title: "Drona 2.0 JEE Class 11th",
    thumbnail: "https://dulae92u7241v.cloudfront.net/1772100600/admin_v2/uploads/courses/thumbnail/2967410_131_drona%202.0%20JEE%20banner%20app.png",
    offer_price: "4999.00",
    mrp: "",
    start_date: "1772821801",
    end_date: "1843410599"
  },
  {
    id: 151,
    title: "Drona JEE class 11th",
    thumbnail: "https://dulae92u7241v.cloudfront.net/1772100600/admin_v2/uploads/courses/thumbnail/7574748_131_Class%2011th%20Mission%20Jeet%20JEE%20App%20Banners.jpg",
    offer_price: "4999.00",
    mrp: "",
    start_date: "1772821801",
    end_date: "1843410599"
  },
  {
    id: 152,
    title: "Drona NEET class 11th",
    thumbnail: "https://dulae92u7241v.cloudfront.net/1772100600/admin_v2/uploads/courses/thumbnail/4072473_131_Class%2011th%20Mission%20Jeets%20NEET%20App%20Banners.jpg",
    offer_price: "4999.00",
    mrp: "",
    start_date: "1772821801",
    end_date: "1843410599"
  }
];

export default function handler(req, res) {
  // ✅ CORS Headers - Allow EVERYONE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight request for 24 hours
  
  // ✅ Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Get query parameters
  const { id } = req.query;
  
  // If ID is provided, return single course
  if (id) {
    const course = courses.find(c => c.id == id);
    if (course) {
      res.status(200).json({ 
        success: true, 
        data: course,
        message: "Course found"
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: "Course not found",
        data: null
      });
    }
  } 
  // Otherwise return all courses
  else {
    res.status(200).json({ 
      success: true, 
      data: courses, 
      count: courses.length,
      message: "Courses fetched successfully"
    });
  }
}
