const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { verifyGoogleToken } = require('../services/googleAuthService');

const serializeUser = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  coins: user.coins,
  role: user.role,
  googleId: user.googleId
});

const buildAuthResponse = (user) => ({
  message: 'Authentication successful',
  token: generateToken(user._id),
  user: serializeUser(user)
});

const signup = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const user = await User.create({
    email,
    password,
    name,
    role: email === process.env.DEFAULT_ADMIN_EMAIL ? 'admin' : 'user'
  });

  res.status(201).json(buildAuthResponse(user));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  res.json(buildAuthResponse(user));
});

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const payload = await verifyGoogleToken(credential);
  const email = payload.email?.toLowerCase();

  if (!email) {
    res.status(400);
    throw new Error('Google account did not include an email.');
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      name: payload.name || email.split('@')[0],
      googleId: payload.sub,
      role: email === process.env.DEFAULT_ADMIN_EMAIL ? 'admin' : 'user'
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }

  res.json(buildAuthResponse(user));
});

const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

module.exports = {
  signup,
  login,
  googleLogin,
  getProfile
};
