const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI not found in .env file");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", true);
    console.log("Connecting to MongoDB...");

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected successfully");
    return mongoose.connection;
  } catch (e) {
    console.error("❌ MongoDB connection error:", e.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
