// api/config/db.js
const mongoose = require('mongoose');

const connectWithDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    const dbUrl = String(process.env.DB_URL || '').trim();
    if (!dbUrl) {
      console.error('DB_URL is missing. Set it in your environment variables.');
      process.exit(1);
    }

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err?.message || err);
    });

    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('DB connected successfully');
  } catch (err) {
    console.log('DB connection failed');
    console.log(err);
    process.exit(1);
  }
};

module.exports = connectWithDB;
