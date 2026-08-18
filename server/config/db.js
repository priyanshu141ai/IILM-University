// ==========================================
// MongoDB Database Connection
// ==========================================
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Disable strict query warnings (Mongoose 7+)
    mongoose.set('strictQuery', false);

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not configured');
    }

    // Connect to MongoDB using the URI from the environment
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // ==========================================
    // Connection Event Handlers
    // ==========================================

    // When successfully connected
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    // When connection throws an error
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err.message);
    });

    // When connection is disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('🔴 Mongoose disconnected from MongoDB');
    });

    // If Node process ends, close the connection
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('👋 Mongoose connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('💡 Tips:');
    console.error('   1. Make sure MongoDB is running');
    console.error('   2. Check your MONGODB_URI in .env file');
    console.error('   3. For Atlas, whitelist your IP address');
    console.error('   4. Verify username/password in connection string');

    // Keep the HTTP server available so health checks can report the issue.
    return false;
  }
};

module.exports = connectDB;
