const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      minlength: 6,
      select: false
    },
    googleId: {
      type: String,
      default: null
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    jobTitle: {
      type: String,
      trim: true,
      default: ''
    },
    useCase: {
      type: String,
      trim: true,
      default: ''
    },
    preferredContactMethod: {
      type: String,
      enum: ['email', 'whatsapp', 'telegram', ''],
      default: ''
    },
    messagingHandle: {
      type: String,
      trim: true,
      default: ''
    },
    termsAcceptedAt: {
      type: Date,
      default: null
    },
    signupIp: {
      type: String,
      trim: true,
      default: ''
    },
    lastKnownIp: {
      type: String,
      trim: true,
      default: ''
    },
    coins: {
      type: Number,
      default: 1000,
      min: 0
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function savePassword(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  if (typeof this.password === 'string' && this.password.startsWith('$2')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
