const mongoose = require('mongoose');
uri='mongodb+srv://ashtavinayakcasino:ashtavinayakcasino@cluster0.1xwmd3c.mongodb.net/casino_wallets?retryWrites=true&w=majority&appName=Cluster0'

async function connectDB() {
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
