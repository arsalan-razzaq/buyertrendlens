const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SignupRequest = require('../models/SignupRequest');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { verifyGoogleToken } = require('../services/googleAuthService');
const { sendSignupOtpEmail } = require('../services/emailService');

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

const otpLifetimeMinutes = Number(process.env.SIGNUP_OTP_TTL_MINUTES || 10);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtpCode = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const createGoogleCompletionToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.GOOGLE_SIGNUP_TOKEN_EXPIRES_IN || '20m'
  });

const verifyGoogleCompletionToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

const isUserProfileComplete = (user) =>
  Boolean(
    user?.name &&
      user?.email &&
      user?.phoneNumber &&
      user?.country &&
      user?.useCase &&
      user?.preferredContactMethod &&
      user?.termsAcceptedAt
  );

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
  googleId: user.googleId,
  profileComplete: isUserProfileComplete(user)
});

const buildAuthResponse = (user) => ({
  message: 'Authentication successful',
  token: generateToken(user._id),
  user: serializeUser(user)
});

const buildGoogleCompletionResponse = ({ signupToken, profile }) => ({
  message: 'Additional profile details are required to finish Google signup.',
  profileCompletionRequired: true,
  signupToken,
  profile
});

const signupStart = asyncHandler(async (req, res) => {
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

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const otp = createOtpCode();
  const passwordHash = await bcrypt.hash(password, 10);
  const payload = {
    email: normalizedEmail,
    passwordHash,
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
    role: normalizedEmail === process.env.DEFAULT_ADMIN_EMAIL ? 'admin' : 'user'
  };

  const expiresAt = new Date(Date.now() + otpLifetimeMinutes * 60 * 1000);

  await SignupRequest.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      otpHash: hashOtpCode(otp),
      expiresAt,
      payload
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  await sendSignupOtpEmail({
    to: normalizedEmail,
    name,
    otp,
    expiresInMinutes: otpLifetimeMinutes
  });

  res.status(202).json({
    message: 'Verification code sent to your email.',
    requiresOtpVerification: true,
    email: normalizedEmail,
    expiresAt
  });
});

const signupVerify = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || '').trim();

  const pendingSignup = await SignupRequest.findOne({ email });
  if (!pendingSignup) {
    res.status(404);
    throw new Error('Signup verification request not found. Start signup again.');
  }

  if (pendingSignup.expiresAt.getTime() < Date.now()) {
    await SignupRequest.deleteOne({ _id: pendingSignup._id });
    res.status(410);
    throw new Error('Verification code expired. Start signup again.');
  }

  if (pendingSignup.otpHash !== hashOtpCode(otp)) {
    res.status(400);
    throw new Error('Invalid verification code.');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    await SignupRequest.deleteOne({ _id: pendingSignup._id });
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const user = await User.create({
    email: pendingSignup.payload.email,
    password: pendingSignup.payload.passwordHash,
    name: pendingSignup.payload.name,
    phoneNumber: pendingSignup.payload.phoneNumber,
    country: pendingSignup.payload.country,
    companyName: pendingSignup.payload.companyName,
    jobTitle: pendingSignup.payload.jobTitle,
    useCase: pendingSignup.payload.useCase,
    preferredContactMethod: pendingSignup.payload.preferredContactMethod,
    messagingHandle: pendingSignup.payload.messagingHandle,
    termsAcceptedAt: pendingSignup.payload.termsAcceptedAt,
    signupIp: pendingSignup.payload.signupIp,
    lastKnownIp: getClientIp(req) || pendingSignup.payload.lastKnownIp,
    role: pendingSignup.payload.role
  });

  await SignupRequest.deleteOne({ _id: pendingSignup._id });
  res.status(201).json(buildAuthResponse(user));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (user && !user.password && user.googleId) {
    res.status(400);
    throw new Error('This account uses Google sign-in. Continue with Google.');
  }

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  res.json(buildAuthResponse(user));
});

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const payload = await verifyGoogleToken(credential);
  const email = normalizeEmail(payload.email);

  if (!email) {
    res.status(400);
    throw new Error('Google account did not include an email.');
  }

  let user = await User.findOne({ email });
  if (!user) {
    return res.status(202).json(
      buildGoogleCompletionResponse({
        signupToken: createGoogleCompletionToken({
          email,
          name: payload.name || email.split('@')[0],
          googleId: payload.sub
        }),
        profile: {
          email,
          name: payload.name || email.split('@')[0]
        }
      })
    );
  }

  if (!isUserProfileComplete(user)) {
    return res.status(202).json(
      buildGoogleCompletionResponse({
        signupToken: createGoogleCompletionToken({
          email,
          name: user.name || payload.name || email.split('@')[0],
          googleId: payload.sub,
          userId: String(user._id)
        }),
        profile: {
          email: user.email,
          name: user.name || payload.name || email.split('@')[0],
          phoneNumber: user.phoneNumber,
          country: user.country,
          companyName: user.companyName,
          jobTitle: user.jobTitle,
          useCase: user.useCase,
          preferredContactMethod: user.preferredContactMethod,
          messagingHandle: user.messagingHandle,
          termsAccepted: Boolean(user.termsAcceptedAt)
        }
      })
    );
  }

  if (!user.googleId) {
    user.googleId = payload.sub;
    user.lastKnownIp = getClientIp(req);
    await user.save();
  } else {
    user.lastKnownIp = getClientIp(req);
    await user.save();
  }

  res.json(buildAuthResponse(user));
});

const completeGoogleSignup = asyncHandler(async (req, res) => {
  const {
    signupToken,
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

  let tokenPayload;

  try {
    tokenPayload = verifyGoogleCompletionToken(signupToken);
  } catch {
    res.status(401);
    throw new Error('Google signup session expired. Continue with Google again.');
  }

  const email = normalizeEmail(tokenPayload.email);
  const basePayload = {
    email,
    name,
    phoneNumber,
    country,
    companyName,
    jobTitle,
    useCase,
    preferredContactMethod,
    messagingHandle,
    termsAcceptedAt: termsAccepted ? new Date() : null,
    lastKnownIp: getClientIp(req),
    googleId: tokenPayload.googleId
  };

  let user;

  if (tokenPayload.userId) {
    user = await User.findById(tokenPayload.userId);

    if (!user) {
      res.status(404);
      throw new Error('Account not found. Continue with Google again.');
    }

    Object.assign(user, basePayload);
    if (!user.signupIp) {
      user.signupIp = getClientIp(req);
    }
    await user.save();
  } else {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409);
      throw new Error('An account with this email already exists.');
    }

    user = await User.create({
      ...basePayload,
      signupIp: getClientIp(req),
      role: email === process.env.DEFAULT_ADMIN_EMAIL ? 'admin' : 'user'
    });
  }

  res.status(201).json(buildAuthResponse(user));
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
  signupStart,
  signupVerify,
  login,
  googleLogin,
  completeGoogleSignup,
  getSignupContext,
  getProfile
};
