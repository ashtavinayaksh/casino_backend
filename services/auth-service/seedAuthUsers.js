// seedAuthUsers.js
require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: () => new Date() }
});

const User = mongoose.model('User', userSchema);

const users = [
  { _id: '68eb94c22a7983ea19b0bd6a', name: 'Alice', email: 'alice@example.com', password: 'hashedpassword1' },
  { _id: '68eb94c22a7983ea19b0bd6b', name: 'Bob', email: 'bob@example.com', password: 'hashedpassword2' },
  { _id: '68eb94c22a7983ea19b0bd6c', name: 'Charlie', email: 'charlie@example.com', password: 'hashedpassword3' },
  { _id: '68eb94c22a7983ea19b0bd6d', name: 'Diana', email: 'diana@example.com', password: 'hashedpassword4' },
  { _id: '68eb94c22a7983ea19b0bd6e', name: 'Evan', email: 'evan@example.com', password: 'hashedpassword5' },
  { _id: '68eb94c22a7983ea19b0bd6f', name: 'Fiona', email: 'fiona@example.com', password: 'hashedpassword6' },
  { _id: '68eb94c22a7983ea19b0bd60', name: 'George', email: 'george@example.com', password: 'hashedpassword7' },
  { _id: '68eb94c22a7983ea19b0bd61', name: 'Hannah', email: 'hannah@example.com', password: 'hashedpassword8' },
  { _id: '68eb94c22a7983ea19b0bd62', name: 'Ivan', email: 'ivan@example.com', password: 'hashedpassword9' },
  { _id: '68eb94c22a7983ea19b0bd63', name: 'Julia', email: 'julia@example.com', password: 'hashedpassword10' }
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB (auth-service)');
    await User.deleteMany({});
    await User.insertMany(users);
    console.log('✅ Inserted 10 test users');
    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌ Error seeding auth users:', err);
  }
})();
