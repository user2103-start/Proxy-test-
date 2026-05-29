const courses = [
  {
    id: 184,
    title: "Drona 2.0 NEET Class 11th",
    thumbnail: "https://dulae92u7241v.cloudfront.net/1772100600/admin_v2/uploads/courses/thumbnail/241318_131_drona%202.0%20NEET%20banner%20app.png",
    offer_price: "4999.00",
    end_date: "2025-12-31"
  },
  {
    id: 185,
    title: "Drona 2.0 JEE Class 11th",
    thumbnail: "https://dulae92u7241v.cloudfront.net/1772100600/admin_v2/uploads/courses/thumbnail/2967410_131_drona%202.0%20JEE%20banner%20app.png",
    offer_price: "4999.00",
    end_date: "2025-12-31"
  }
];

const getDaysLeft = (endDate) => {
  const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
};

function renderCourses() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="courses-grid">
      ${courses.map(course => `
        <div class="course-card">
          <img src="${course.thumbnail}" alt="${course.title}">
          <h3>${course.title}</h3>
          <div class="price">₹${course.offer_price}</div>
          <div class="validity">⏱️ Validity: ${getDaysLeft(course.end_date)} days left</div>
          <button onclick="location.href='/course/${course.id}'">Explore</button>
        </div>
      `).join('')}
    </div>
  `;
}

renderCourses();
