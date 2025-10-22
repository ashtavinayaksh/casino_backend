const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = 'mongodb+srv://ashtavinayakcasino:ashtavinayakcasino@cluster0.1xwmd3c.mongodb.net/casino_wallets?appName=mongosh+2.5.8';

    mongoose.set("strictQuery", true);

    console.log("🚀 Attempting MongoDB connection...");
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB connected successfully to: ${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
