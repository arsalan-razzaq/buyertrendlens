const express = require('express');
const { body } = require('express-validator');
const {
  signupStart,
  signupVerify,
  login,
  googleLogin,
  completeGoogleSignup,
  getSignupContext,
  getProfile
} = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/signup/start',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('country').trim().notEmpty().withMessage('Country is required'),
    body('companyName').optional({ nullable: true }).trim(),
    body('jobTitle').optional({ nullable: true }).trim(),
    body('useCase').trim().notEmpty().withMessage('Use case is required'),
    body('preferredContactMethod')
      .isIn(['email', 'whatsapp', 'telegram'])
      .withMessage('Preferred contact method must be email, WhatsApp, or Telegram'),
    body('messagingHandle').optional({ nullable: true }).trim(),
    body('termsAccepted')
      .custom((value) => value === true || value === 'true')
      .withMessage('You must accept the terms to continue')
  ],
  validateRequest,
  signupStart
);

router.post(
  '/signup/verify',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('Verification code must be 6 digits')
      .isNumeric()
      .withMessage('Verification code must be numeric')
  ],
  validateRequest,
  signupVerify
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  login
);

router.post(
  '/google',
  [body('credential').notEmpty().withMessage('Google credential is required')],
  validateRequest,
  googleLogin
);

router.post(
  '/google/complete',
  [
    body('signupToken').notEmpty().withMessage('Google signup session is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('country').trim().notEmpty().withMessage('Country is required'),
    body('companyName').optional({ nullable: true }).trim(),
    body('jobTitle').optional({ nullable: true }).trim(),
    body('useCase').trim().notEmpty().withMessage('Use case is required'),
    body('preferredContactMethod')
      .isIn(['email', 'whatsapp', 'telegram'])
      .withMessage('Preferred contact method must be email, WhatsApp, or Telegram'),
    body('messagingHandle').optional({ nullable: true }).trim(),
    body('termsAccepted')
      .custom((value) => value === true || value === 'true')
      .withMessage('You must accept the terms to continue')
  ],
  validateRequest,
  completeGoogleSignup
);

router.get('/signup-context', getSignupContext);
router.get('/me', protect, getProfile);

module.exports = router;
