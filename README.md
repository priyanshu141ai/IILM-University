# 🎓 College MOU Portal

A full-stack web application for managing international MOUs (Memorandums of Understanding) and opportunities in colleges. Students can discover and respond to opportunities, teachers can post them and track responses, and admins have complete control over the system.

![Made with Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)

## ✨ Features

### 👨‍🎓 Student
- Browse international opportunities (MOUs, internships, exchange programs, conferences, workshops, research)
- Search and filter by type, country, and keywords
- Express interest with a personalized message
- Track all responses in one place
- Withdraw responses anytime
- See application status updates (Interested → Applied → Shortlisted → Selected/Rejected)

### 👨‍🏫 Teacher
- Create rich opportunity posts with full details (title, type, deadline, eligibility, funding, duration)
- View complete student response details (name, email, ID, phone, message)
- Update response status for each student
- Edit and delete their own posts
- View post statistics (responses, views, engagement)

### 🛡️ Admin
- Beautiful dashboard with real-time statistics
- Manage all users (activate/deactivate accounts)
- View all posts and responses across the platform
- Filter users by role (student/teacher/admin)
- Full system oversight and analytics

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) & bcryptjs
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (no framework needed)
- **Styling:** Custom CSS with modern design system

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (v4.4 or higher) OR a free [MongoDB Atlas](https://www.mongodb.com/atlas) account
- [Git](https://git-scm.com/downloads)
- A code editor (VS Code recommended)

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/college-mou-portal.git
cd college-mou-portal
