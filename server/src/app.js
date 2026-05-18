const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const exportRoutes = require('./routes/exportRoutes');
const walletRoutes = require('./routes/walletRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const isDevelopment = process.env.NODE_ENV !== 'production';
const rateLimitWindowMs = Math.max(Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 1000);
const rateLimitMax = Math.max(Number(process.env.RATE_LIMIT_MAX) || 300, 1);
const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/$/, '');
const buildOriginVariants = (origin) => {
  const normalized = normalizeOrigin(origin);

  if (!normalized) {
    return [];
  }

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();
    const variants = new Set([`${parsed.protocol}//${hostname}${parsed.port ? `:${parsed.port}` : ''}`]);

    if (!hostname.startsWith('www.')) {
      variants.add(`${parsed.protocol}//www.${hostname}${parsed.port ? `:${parsed.port}` : ''}`);
    } else {
      variants.add(`${parsed.protocol}//${hostname.slice(4)}${parsed.port ? `:${parsed.port}` : ''}`);
    }

    return [...variants];
  } catch (error) {
    return [normalized];
  }
};
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
  .flatMap(buildOriginVariants)
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
const shouldEnableRateLimit = process.env.ENABLE_RATE_LIMIT
  ? process.env.ENABLE_RATE_LIMIT === 'true'
  : !isDevelopment;
const trustProxySetting = process.env.TRUST_PROXY?.trim();
const isLocalDevProxyRequest = (req) => req.headers['x-dev-proxy'] === 'vite-local';

if (trustProxySetting === 'true') {
  app.set('trust proxy', true);
} else if (trustProxySetting === 'false') {
  app.set('trust proxy', false);
} else if (trustProxySetting && !Number.isNaN(Number(trustProxySetting))) {
  app.set('trust proxy', Number(trustProxySetting));
} else if (!isDevelopment) {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isDevelopment) {
        callback(null, true);
        return;
      }

      if (!origin || allowedOrigins.has(normalizeOrigin(origin)) || isAllowedVercelOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'));
    }
  })
);
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

if (shouldEnableRateLimit) {
  app.use(
    rateLimit({
      windowMs: rateLimitWindowMs,
      max: rateLimitMax,
      standardHeaders: true,
      skip: (req) => isLocalDevProxyRequest(req),
      message: {
        message: 'Too many requests. Please try again in a moment.'
      }
    })
  );
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
