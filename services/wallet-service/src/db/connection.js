const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri =
      process.env.MONGO_URI ||
      "mongodb+srv://ashtavinayakcasino:ashtavinayakcasino@cluster0.1xwmd3c.mongodb.net/casino_wallets?retryWrites=true&w=majority&appName=Cluster0";

    if (!uri) throw new Error("MongoDB URI is not defined");

    mongoose.set("strictQuery", true);

    console.log("🚀 Attempting MongoDB connection...");
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (e) {
    console.error("❌ DB connect error:", e.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
