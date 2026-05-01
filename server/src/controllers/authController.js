const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { verifyGoogleToken } = require('../services/googleAuthService');

const countryDirectory = {
  PK: { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  IN: { code: 'IN', name: 'India', dialCode: '+91' },
  BD: { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  AE: { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  SA: { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  QA: { code: 'QA', name: 'Qatar', dialCode: '+974' },
  KW: { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  OM: { code: 'OM', name: 'Oman', dialCode: '+968' },
  BH: { code: 'BH', name: 'Bahrain', dialCode: '+973' },
  TR: { code: 'TR', name: 'Turkey', dialCode: '+90' },
  GB: { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  US: { code: 'US', name: 'United States', dialCode: '+1' },
  CA: { code: 'CA', name: 'Canada', dialCode: '+1' },
  AU: { code: 'AU', name: 'Australia', dialCode: '+61' },
  DE: { code: 'DE', name: 'Germany', dialCode: '+49' }
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || '').split(',')[0];
  return (forwardedIp || req.ip || '').trim();
};

const getRequestCountry = (req) => {
  const headerCountryCode =
    req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || req.headers['cloudfront-viewer-country'];

  const countryCode = String(headerCountryCode || '')
    .trim()
    .toUpperCase();

  return countryDirectory[countryCode] || null;
};

const serializeUser = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  phoneNumber: user.phoneNumber,
  country: user.country,
  companyName: user.companyName,
  jobTitle: user.jobTitle,
  useCase: user.useCase,
  preferredContactMethod: user.preferredContactMethod,
  messagingHandle: user.messagingHandle,
  termsAcceptedAt: user.termsAcceptedAt,
  signupIp: user.signupIp,
  lastKnownIp: user.lastKnownIp,
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
  const {
    email,
    password,
    name,
    phoneNumber,
    country,
    companyName,
    jobTitle,
    useCase,
    preferredContactMethod,
    messagingHandle,
    termsAccepted
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const user = await User.create({
    email,
    password,
    name,
    phoneNumber,
    country,
    companyName,
    jobTitle,
    useCase,
    preferredContactMethod,
    messagingHandle,
    termsAcceptedAt: termsAccepted ? new Date() : null,
    signupIp: getClientIp(req),
    lastKnownIp: getClientIp(req),
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
      signupIp: getClientIp(req),
      lastKnownIp: getClientIp(req),
      role: email === process.env.DEFAULT_ADMIN_EMAIL ? 'admin' : 'user'
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    user.lastKnownIp = getClientIp(req);
    await user.save();
  } else {
    user.lastKnownIp = getClientIp(req);
    await user.save();
  }

  res.json(buildAuthResponse(user));
});

const getSignupContext = asyncHandler(async (req, res) => {
  res.json({
    country: getRequestCountry(req),
    ipCaptured: Boolean(getClientIp(req))
  });
});

const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

module.exports = {
  signup,
  login,
  googleLogin,
  getSignupContext,
  getProfile
};
