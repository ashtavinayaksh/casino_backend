const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const { ethers } = require('ethers');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Register new user
 * Accepts username, email (optional), password, and displayName
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password are required" });

    // ✅ Password Strength Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,15}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be 12-15 characters long and include uppercase, lowercase, number, and special character.",
      });
    }

    // Check for duplicate username
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ error: "Username already exists" });

    // Check duplicate email (optional)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email))
        return res.status(400).json({ error: "Invalid email format" });

      const existingEmail = await User.findOne({ email });
      if (existingEmail)
        return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.toLowerCase(),
      email,
      password: hashedPassword,
      displayName: displayName || username,
    });

    // Send confirmation email
    if (email) await sendConfirmationEmail(email, username);

    const token = generateToken({ sub: user._id });
    res.json({ user, token, message: "Registration successful. Confirmation email sent." });
  } catch (e) {
    console.error("❌ Register error:", e);
    res.status(400).json({ error: e.message });
  }
};

// ✅ Helper: Send welcome email
async function sendConfirmationEmail(toEmail, username) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: "Welcome to Casino Platform 🎰",
      html: `
        <h2>Hello ${username},</h2>
        <p>Welcome to our Casino platform! Your account has been successfully created.</p>
        <p>You can now log in and enjoy the games.</p>
      `,
    });

    console.log(`✅ Confirmation email sent to ${toEmail}`);
  } catch (err) {
    console.error("❌ Failed to send confirmation email:", err.message);
  }
}

/**
 * Change Password
 */
exports.changePassword = async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword)
      return res.status(400).json({ error: "All fields are required" });

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,15}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "New password must be 12-15 characters long and include uppercase, lowercase, number, and special character.",
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: "Incorrect old password" });

    // Update new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (e) {
    console.error("❌ Change password error:", e);
    res.status(500).json({ error: e.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate random new password
    const newPassword = generateRandomPassword();
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    // Send new password via email
    await sendNewPasswordEmail(email, user.username, newPassword);

    res.json({ message: "New password sent to your email." });
  } catch (e) {
    console.error("❌ Forgot password error:", e);
    res.status(500).json({ error: e.message });
  }
};

// Helper: Generate strong random password
function generateRandomPassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&";
  let pass = "";
  for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
}

// Helper: Send new password via email
async function sendNewPasswordEmail(toEmail, username, newPassword) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: "Your Casino Account Password Reset 🔒",
    html: `
      <h2>Hello ${username},</h2>
      <p>Your password has been reset. Please use the following new password to log in:</p>
      <p><strong>${newPassword}</strong></p>
      <p>After login, please change your password immediately for security reasons.</p>
    `,
  });

  console.log(`✅ New password email sent to ${toEmail}`);
}


/**
 * Login user
 * Supports login via username OR email + password
 */
exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if ((!username && !email) || !password)
      return res.status(400).json({ error: "Username or email and password are required" });

    // Find user by username or email
    const user = await User.findOne(
      username ? { username: username.toLowerCase() } : { email }
    );

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // ✅ Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid credentials" });

    // ✅ Generate JWT
    const token = generateToken({ sub: user._id });

    // ✅ Response
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      },
      token,
      message: "Login successful",
    });
  } catch (e) {
    console.error("❌ Login error:", e);
    res.status(500).json({ error: e.message });
  }
};


/**
 * Sign-in with Ethereum (SIWE)
 */
exports.siwe = async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    const recovered = ethers.verifyMessage(message, signature);

    if (recovered.toLowerCase() !== address.toLowerCase())
      return res.status(401).json({ error: "Invalid signature" });

    let user = await User.findOne({
      "walletAddresses.address": address.toLowerCase(),
    });

    if (!user) {
      user = await User.create({
        username: `user_${address.slice(2, 8)}`,
        walletAddresses: [{ chain: "evm", address: address.toLowerCase() }],
        displayName: address,
      });
    }

    const token = generateToken({ sub: user._id });
    res.json({ user, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Get user profile by username OR userId
 */
exports.getProfile = async (req, res) => {
  try {
    const { idOrUsername } = req.params;

    // Check if it's a Mongo ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrUsername);

    const query = isObjectId
      ? { _id: idOrUsername }
      : { username: idOrUsername.toLowerCase() };

    const user = await User.findOne(query)
      .select('-password -__v') // hide sensitive fields
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      kycStatus: user.kycStatus,
      emailVerified: user.emailVerified,
      walletAddresses: user.walletAddresses,
      createdAt: user.createdAt
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};


// Send OTP via email
async function sendOTPEmail(toEmail, username, otp) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: "Casino Email Verification OTP 🔐",
    html: `
      <h2>Hello ${username},</h2>
      <p>Please verify your email by entering the OTP below:</p>
      <h1 style="color:#007bff;">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
    `,
  });

  console.log(`✅ OTP email sent to ${toEmail}: ${otp}`);
}

// Send OTP API
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.emailVerified)
      return res.status(400).json({ error: "Email is already verified" });

    const otp = generateOTP();

    await sendOTPEmail(email, user.username || "User", otp);

    res.json({ message: "OTP sent successfully to your email" });
  } catch (e) {
    console.error("❌ sendOtp error:", e);
    res.status(500).json({ error: e.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.emailVerified)
      return res.status(400).json({ error: "Email already verified" });

    user.emailVerified = true;
    await user.save();

    res.json({ message: "✅ Email verified successfully. You can now log in." });
  } catch (e) {
    console.error("❌ verifyEmail error:", e);
    res.status(500).json({ error: e.message });
  }
};
