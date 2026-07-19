const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const db = require('../config/db');

/**
 * Short-lived access token carried on every request (Authorization header).
 * Kept short (15 min default) so a leaked token has a small blast radius.
 */
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Refresh tokens are long-lived, so we never trust the JWT signature alone --
 * we also store a SHA-256 hash of the token server-side. This means a
 * compromised token can be revoked instantly (e.g. on logout or suspected
 * theft) instead of remaining valid until it naturally expires.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId) {
  const token = jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt]
  );

  return token;
}

async function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET); // throws if invalid/expired
  const tokenHash = hashToken(token);

  const { rows } = await db.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash, payload.sub]
  );

  if (rows.length === 0) {
    throw new Error('Refresh token has been revoked or is invalid');
  }

  return payload;
}

async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  await db.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [
    tokenHash,
  ]);
}

async function revokeAllUserTokens(userId) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
