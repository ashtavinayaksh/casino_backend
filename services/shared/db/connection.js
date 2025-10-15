const mongoose = require('mongoose');

async function connectDB(uri) {
  try {
    if (!uri) throw new Error("MongoDB URI is not defined");

    mongoose.set('strictQuery', true);

    console.log("Connecting to MongoDB with URI:", uri);
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      dbName: 'casino_wallets',
    });

    console.log("✅ MongoDB connected successfully");
    return mongoose.connection;
  } catch (e) {
    console.error("❌ DB connect error:", e.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
