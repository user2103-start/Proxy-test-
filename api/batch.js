// api/batches.js
const batches = [
  {
    id: 8,
    cls: 11,
    title: "JEE 2028: 11th Class OG KOTA BATCH",
    imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-03-20-0_7755858005992874.jpeg",
    price: "Free",
    originalPrice: "",
    discount: ""
  },
  {
    id: 10,
    cls: 12,
    title: "JEE 2027: 12th Class OG KOTA Batch",
    imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-03-20-0_1711192735086824.jpeg",
    price: "Free",
    originalPrice: "",
    discount: ""
  },
  {
    id: 35,
    cls: 11,
    title: "JEE 2028: 11th Class P2 Batch",
    imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-06-28-0_5171654847118846.png",
    price: "Free",
    originalPrice: "",
    discount: ""
  },
  {
    id: 36,
    cls: 12,
    title: "JEE 2027: 12th Class A2 Batch",
    imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-06-10-0_5680222141996314.png",
    price: "Free",
    originalPrice: "",
    discount: ""
  },
  {
    id: 7,
    cls: 11,
    title: "Free Resources",
    imageUrl: "https://appx-content-v2.classx.co.in/paid_course3/2026-03-15-0_9931362198126962.jpeg",
    price: "Free",
    originalPrice: "",
    discount: ""
  }
];

export default function handler(req, res) {
  const { cls } = req.query;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  let result = batches;
  
  if (cls) {
    result = batches.filter(b => b.cls === parseInt(cls));
  }
  
  res.status(200).json({
    success: true,
    data: result
  });
}
