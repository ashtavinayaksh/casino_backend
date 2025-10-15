const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const { ethers } = require('ethers');

/**
 * Register new user
 * Accepts username, email (optional), password, and displayName
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password are required" });

    // Check for duplicate username
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ error: "Username already exists" });

    // Check duplicate email (optional)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail)
        return res.status(400).json({ error: "Email already exists" });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      email,
      password,
      displayName: displayName || username,
    });

    const token = generateToken({ sub: user._id });
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

/**
 * Login user
 * Supports login via username OR email + password
 */
exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password)
      return res.status(400).json({ error: "Username or email and password are required" });

    // Match user either by username or email
    const query = username
      ? { username: username.toLowerCase(), password }
      : { email, password };

    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken({ sub: user._id });
    res.json({ user, token });
  } catch (e) {
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
      walletAddresses: user.walletAddresses,
      createdAt: user.createdAt
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
