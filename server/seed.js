// ==========================================
// College MOU Portal - Database Seeder
// ==========================================
// Run: node server/seed.js
// Or:  npm run seed
// ==========================================

const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
require('dotenv').config();

const seedData = async () => {
  try {
    // ==========================================
    // Connect to MongoDB
    // ==========================================
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ==========================================
    // Clear Existing Data
    // ==========================================
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Post.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // ==========================================
    // Create Admin User
    // ==========================================
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      name: 'College Administrator',
      email: 'admin@college.edu',
      password: 'admin123',
      role: 'admin',
      department: 'Administration',
      phone: '9876543210'
    });
    console.log('✅ Admin created\n');

    // ==========================================
    // Create Teacher Users
    // ==========================================
    console.log('👨‍🏫 Creating teachers...');
    const teacher1 = await User.create({
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh@college.edu',
      password: 'teacher123',
      role: 'teacher',
      department: 'Computer Science',
      employeeId: 'EMP001',
      phone: '9876543211'
    });

    const teacher2 = await User.create({
      name: 'Prof. Priya Sharma',
      email: 'priya@college.edu',
      password: 'teacher123',
      role: 'teacher',
      department: 'Electronics',
      employeeId: 'EMP002',
      phone: '9876543212'
    });
    console.log('✅ 2 Teachers created\n');

    // ==========================================
    // Create Student Users
    // ==========================================
    console.log('👨‍🎓 Creating students...');
    const students = await User.create([
      {
        name: 'Aarav Patel',
        email: 'aarav@student.edu',
        password: 'student123',
        role: 'student',
        department: 'Computer Science',
        studentId: 'CS2021001',
        phone: '9876543221'
      },
      {
        name: 'Diya Singh',
        email: 'diya@student.edu',
        password: 'student123',
        role: 'student',
        department: 'Electronics',
        studentId: 'EC2021002',
        phone: '9876543222'
      },
      {
        name: 'Arjun Reddy',
        email: 'arjun@student.edu',
        password: 'student123',
        role: 'student',
        department: 'Mechanical',
        studentId: 'ME2021003',
        phone: '9876543223'
      },
      {
        name: 'Sneha Iyer',
        email: 'sneha@student.edu',
        password: 'student123',
        role: 'student',
        department: 'Computer Science',
        studentId: 'CS2021004',
        phone: '9876543224'
      },
      {
        name: 'Rohan Gupta',
        email: 'rohan@student.edu',
        password: 'student123',
        role: 'student',
        department: 'Civil',
        studentId: 'CE2021005',
        phone: '9876543225'
      }
    ]);
    console.log(`✅ ${students.length} Students created\n`);

    // ==========================================
    // Create Sample Posts (Opportunities)
    // ==========================================
    console.log('📝 Creating sample posts...');
    const posts = await Post.create([
      {
        title: 'Summer Research Internship at MIT, USA',
        description: 'Excellent opportunity for undergraduate students to work on cutting-edge AI/ML research projects at Massachusetts Institute of Technology. Selected students will receive a stipend of $5000/month and accommodation. Open to students from CS, EE, and related departments with strong programming skills and research aptitude. You will work alongside PhD students and faculty on publishable research projects.',
        type: 'Internship',
        country: 'USA',
        university: 'Massachusetts Institute of Technology (MIT)',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        eligibility: 'B.Tech 3rd year, CGPA > 8.0, CS/EE department',
        duration: '3 months (May - July)',
        funding: '$5000/month + Accommodation',
        postedBy: teacher1._id,
        postedByName: teacher1.name
      },
      {
        title: 'Student Exchange Program - TU Berlin, Germany',
        description: 'Technische Universität Berlin offers an exchange program for engineering students. Spend a semester studying in Germany with a full tuition waiver. Courses are available in English. Gain valuable exposure to European engineering practices and culture. Apply with your transcripts and motivation letter. This is a life-changing opportunity to study at one of Europe\'s top technical universities.',
        type: 'Exchange Program',
        country: 'Germany',
        university: 'Technische Universität Berlin',
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        eligibility: 'B.Tech 2nd/3rd year, all branches',
        duration: '6 months',
        funding: 'Tuition waiver, self-funded accommodation',
        postedBy: teacher2._id,
        postedByName: teacher2.name
      },
      {
        title: 'MOU Signed with NUS Singapore for Joint Research',
        description: 'We are pleased to announce the signing of an MOU with the National University of Singapore (NUS) for joint research collaboration in the field of sustainable energy and smart cities. Faculty and student exchange programs will be initiated under this MOU. Interested students can apply for research positions in renewable energy, IoT, and urban planning projects.',
        type: 'MOU',
        country: 'Singapore',
        university: 'National University of Singapore (NUS)',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        eligibility: 'All departments - M.Tech/PhD preferred',
        duration: '3 years',
        funding: 'Joint funding available',
        postedBy: teacher1._id,
        postedByName: teacher1.name
      },
      {
        title: 'International Conference on AI - IEEE Tokyo',
        description: 'IEEE International Conference on Artificial Intelligence and Applications. Students can present their research papers and network with international researchers. Selected papers will be published in IEEE Xplore. Partial travel support available for accepted papers. This is a great opportunity to present your work on an international platform.',
        type: 'Conference',
        country: 'Japan',
        university: 'IEEE - Tokyo',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        eligibility: 'All students with research papers',
        duration: '3 days',
        funding: 'Partial travel support available',
        postedBy: teacher1._id,
        postedByName: teacher1.name
      },
      {
        title: 'Workshop on Quantum Computing - University of Oxford',
        description: 'Two-week intensive workshop on Quantum Computing at the University of Oxford. Hands-on training with IBM Quantum computers. Learn quantum algorithms, quantum cryptography, and quantum machine learning. Limited seats available. Apply early! Includes lab sessions, lectures by world-renowned faculty, and networking opportunities.',
        type: 'Workshop',
        country: 'UK',
        university: 'University of Oxford',
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        eligibility: 'B.Tech/M.Tech CS, Physics',
        duration: '2 weeks',
        funding: '£500 fee, scholarships available',
        postedBy: teacher2._id,
        postedByName: teacher2.name
      },
      {
        title: 'Research Position - Stanford University AI Lab',
        description: 'Undergraduate research opportunity at Stanford AI Lab working on computer vision and deep learning. Perfect for students interested in pursuing a PhD. You will work directly with PhD students and faculty on publishable research. Strong recommendation letters are provided for excellent performers. Publications in top-tier venues are possible.',
        type: 'Research',
        country: 'USA',
        university: 'Stanford University',
        deadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
        eligibility: 'B.Tech/M.Tech CS, strong ML background',
        duration: '6 months',
        funding: '$4000/month stipend',
        postedBy: teacher1._id,
        postedByName: teacher1.name
      },
      {
        title: 'Google Summer of Code 2024 - Open Source',
        description: 'Google Summer of Code is a global online program focused on bringing more student developers into open-source software development. Students work with an open-source organization on a 12+ week programming project during their break from school. A stipend is provided by Google.',
        type: 'Internship',
        country: 'Remote',
        university: 'Google Open Source',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        eligibility: 'All students 18+ with programming skills',
        duration: '12+ weeks',
        funding: '$1500 - $6600 based on country',
        postedBy: teacher1._id,
        postedByName: teacher1.name
      },
      {
        title: 'Erasmus Mundus Scholarship - Europe',
        description: 'Fully funded master’s program in Europe under the Erasmus Mundus Scholarship. Study in 2-3 European countries and receive a full tuition waiver, a monthly stipend of €1400, travel allowance, and insurance. Programs are available in Engineering, Business, Science, and Arts. Applications are open for the Fall 2024 intake.',
        type: 'Opportunity',
        country: 'Multiple (Europe)',
        university: 'Erasmus Mundus Consortium',
        deadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
        eligibility: 'Bachelor\'s degree with 60%+',
        duration: '2 years (Masters)',
        funding: 'Full scholarship + €1400/month',
        postedBy: teacher2._id,
        postedByName: teacher2.name
      }
    ]);
    console.log(`✅ ${posts.length} Sample posts created\n`);

    // ==========================================
    // Success Summary
    // ==========================================
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   🎉 DATABASE SEEDED SUCCESSFULLY!       ║');
    console.log('╠═══════════════════════════════════════════╣');
    console.log('║                                           ║');
    console.log('║   📊 Summary:                             ║');
    console.log(`║   • 1 Admin created                       ║`);
    console.log(`║   • 2 Teachers created                    ║`);
    console.log(`║   • ${students.length} Students created                    ║`);
    console.log(`║   • ${posts.length} Posts created                      ║`);
    console.log('║                                           ║');
    console.log('╠═══════════════════════════════════════════╣');
    console.log('║   🔑 DEMO LOGIN CREDENTIALS               ║');
    console.log('╠═══════════════════════════════════════════╣');
    console.log('║                                           ║');
    console.log('║   🛡️  Admin:                              ║');
    console.log('║       admin@college.edu / admin123        ║');
    console.log('║                                           ║');
    console.log('║   👨‍🏫 Teacher:                            ║');
    console.log('║       rajesh@college.edu / teacher123     ║');
    console.log('║       priya@college.edu / teacher123      ║');
    console.log('║                                           ║');
    console.log('║   👨‍🎓 Student:                            ║');
    console.log('║       aarav@student.edu / student123      ║');
    console.log('║       diya@student.edu / student123       ║');
    console.log('║       arjun@student.edu / student123      ║');
    console.log('║       sneha@student.edu / student123      ║');
    console.log('║       rohan@student.edu / student123      ║');
    console.log('║                                           ║');
    console.log('╠═══════════════════════════════════════════╣');
    console.log('║   🌐 Server: http://localhost:5000        ║');
    console.log('║   📚 Run: npm start                       ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedData();
