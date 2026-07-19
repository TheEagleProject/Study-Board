const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');

const env = require('./config/env');
const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

// Trust the first proxy hop (AWS ALB/ELB) so req.ip and rate limiting see
// the real client IP instead of the load balancer's.
app.set('trust proxy', 1);

// --- Security middleware ---
app.use(helmet()); // sensible security headers (CSP, X-Frame-Options, HSTS, etc.)
app.use(hpp()); // guards against HTTP parameter pollution attacks
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })
);
app.use(compression());
app.use(express.json({ limit: '100kb' })); // cap body size against DoS-by-payload

// --- Observability ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

// --- Routes ---
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', apiLimiter, roomRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
