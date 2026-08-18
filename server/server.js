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
// Middleware
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
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
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==========================================
// Serve Frontend
// ==========================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ==========================================
// Global Error Handling
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : {}
  });
});

// ==========================================
// 404 Handler
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

// IMPORTANT FOR RENDER:
// Bind to 0.0.0.0 so Render can detect the open port.
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('==========================================');
  console.log('🚀 College MOU Portal Server Started');
  console.log(`📡 Port: ${ PORT } `);
  console.log('🌐 Host: 0.0.0.0');
  console.log(`🌍 Environment: ${ process.env.NODE_ENV || 'development' } `);
  console.log('==========================================');
});

// ==========================================
// Connect to MongoDB
// ==========================================
connectDB()
  .then((connected) => {
    if (!connected) return;
    console.log('✅ MongoDB connection established');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });

// ==========================================
// Handle Unhandled Promise Rejections
// ==========================================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);

  // Close server gracefully
  server.close(() => {
    process.exit(1);
  });
});

// ==========================================
// Handle Uncaught Exceptions
// ==========================================
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
