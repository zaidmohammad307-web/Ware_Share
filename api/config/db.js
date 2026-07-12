// api/config/db.js
const mongoose = require('mongoose');

const connectWithDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    const dbUrl = String(process.env.DB_URL || '').trim();
    if (!dbUrl) {
      console.error('FATAL: DB_URL is not set.');
      process.exit(1);
    }

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err?.message || err);
    });

    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log('DB connected successfully');
  } catch (err) {
    console.error('FATAL: DB connection failed');
    console.error('  name   :', err?.name);
    console.error('  message:', err?.message);
    console.error('  code   :', err?.code);
    process.exit(1);
  }
};

module.exports = connectWithDB;

