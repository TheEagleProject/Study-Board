const { Pool } = require('pg');
const env = require('./env');
const logger = require('./logger');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Idle client errors (e.g. network blip) should not crash the process.
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

/**
 * Always query through this helper (never string-concatenate SQL) so every
 * call site uses parameterized queries and is immune to SQL injection.
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn('Slow query detected', { text, duration });
  }
  return result;
}

/**
 * Use for multi-statement operations that must succeed or fail together
 * (e.g. creating a room + its owner membership row).
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
