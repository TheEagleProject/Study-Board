const express = require('express');
const db = require('../config/db');
const redis = require('../config/redis');

const router = express.Router();

// AWS ALB / ECS health checks hit this endpoint. It actually verifies
// downstream dependencies (not just "the process is alive") so a container
// with a dead DB connection gets marked unhealthy and cycled, instead of
// silently serving 500s to real users.
router.get('/', async (req, res) => {
  const checks = { database: 'unknown', redis: 'unknown' };
  let healthy = true;

  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'error';
    healthy = false;
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch (err) {
    checks.redis = 'error';
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({ success: healthy, checks });
});

module.exports = router;
