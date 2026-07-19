const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');
const env = require('../config/env');

// A Redis-backed store means the limit is shared across every instance of
// the API (important once this is deployed behind a load balancer with
// more than one container) rather than each instance tracking its own
// in-memory counter.
function makeLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: message },
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: 'rl:',
    }),
  });
}

// General API traffic.
const apiLimiter = makeLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: 'Too many requests, please try again shortly.',
});

// Tighter limit on auth endpoints specifically to slow down credential
// stuffing / brute-force login attempts.
const authLimiter = makeLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: 'Too many authentication attempts. Please wait before trying again.',
});

module.exports = { apiLimiter, authLimiter };
