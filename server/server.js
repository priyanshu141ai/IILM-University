// ==========================================
// College MOU Portal - Main Server File
// ==========================================
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const responseRoutes = require('./routes/responses');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const partnerRoutes = require('./routes/partners');
const opportunityRoutes = require('./routes/opportunities');

const app = express();

// ==========================================
// Connect to MongoDB Database
// ==========================================
connectDB();

// ==========================================
// Middleware
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// API Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/opportunities', opportunityRoutes);

// ==========================================
// Health Check Route
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==========================================
// Serve Frontend (All other routes)
// ==========================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ==========================================
// Global Error Handling Middleware
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// ==========================================
// Handle 404 - Not Found
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ==========================================
// Start Server
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════╗');
  console.log(`║   🚀 Server running on port ${PORT}        ║`);
  console.log(`║   📍 http://localhost:${PORT}              ║`);
  console.log(`║   🌍 Environment: ${process.env.NODE_ENV || 'development'}            ║`);
  console.log('╚═══════════════════════════════════════════╝');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});
