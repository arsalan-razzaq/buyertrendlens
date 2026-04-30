const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');

let io;

const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/$/, '');

const isAllowedVercelOrigin = (origin) => {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === 'vercel.app' || hostname.endsWith('.vercel.app');
  } catch (error) {
    return false;
  }
};

const configuredOrigins = [process.env.CORS_ORIGINS, process.env.CLIENT_URL]
  .filter(Boolean)
  .flatMap((value) => String(value).split(','))
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

if (!allowedOrigins.size) {
  allowedOrigins.add('http://localhost:5173');
}

[
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
].forEach((origin) => allowedOrigins.add(origin));

const resolveSocketToken = (socket) => {
  const handshakeToken = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (handshakeToken) {
    return String(handshakeToken).trim();
  }

  const authorizationHeader = socket.handshake.headers?.authorization;

  if (authorizationHeader?.startsWith('Bearer ')) {
    return authorizationHeader.slice(7).trim();
  }

  return '';
};

const serialize = (value) => (typeof value?.toObject === 'function' ? value.toObject() : value);

const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        const isDevelopment = process.env.NODE_ENV !== 'production';

        if (
          isDevelopment ||
          !origin ||
          allowedOrigins.has(normalizeOrigin(origin)) ||
          isAllowedVercelOrigin(origin)
        ) {
          callback(null, true);
          return;
        }

        callback(new Error('Socket origin not allowed'));
      }
    }
  });

  io.use(async (socket, next) => {
    const token = resolveSocketToken(socket);

    if (!token) {
      next(new Error('Authentication required.'));
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        next(new Error('User not found.'));
        return;
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Session expired or invalid.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);

    socket.emit('socket:ready', {
      userId: String(user._id),
      role: user.role
    });
  });

  return io;
};

const emitToUser = (userId, eventName, payload) => {
  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId}`).emit(eventName, serialize(payload));
};

const emitToAdmins = (eventName, payload) => {
  if (!io) {
    return;
  }

  io.to('role:admin').emit(eventName, serialize(payload));
};

module.exports = {
  initSocketServer,
  emitToUser,
  emitToAdmins
};
