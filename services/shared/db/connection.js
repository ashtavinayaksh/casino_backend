const mongoose = require("mongoose");
// const uri = 'mongodb+srv://ashtavinayakcasino:ashtavinayakcasino@cluster0.1xwmd3c.mongodb.net/casino_wallets?appName=mongosh+2.5.8'

const uri = process.env.MONGO_URI || 
  "mongodb+srv://ashtavinayakcasino:ashtavinayakcasino@cluster0.1xwmd3c.mongodb.net/casino_wallets?retryWrites=true&w=majority&appName=Cluster0";

async function connectDB() {
  try {
    mongoose.set("strictQuery", true);

    console.log("🚀 Attempting MongoDB connection...");
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      dbName: "casino_wallets",
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
