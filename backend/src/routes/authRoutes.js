const express = require('express');
const userModel = require('../models/userModel');
const { hashPassword, verifyPassword } = require('../utils/password');
const {
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require('../utils/tokenService');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/requireAuth');
const { authLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/authValidators');
const { ConflictError, UnauthorizedError } = require('../utils/errors');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, displayName, password } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) {
      // Same message as "wrong password" cases would be excessive here --
      // registration collisions are fine to disclose since the alternative
      // (silent failure) creates a worse support/UX experience.
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(password);
    const user = await userModel.createUser({ email, displayName, passwordHash });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const userRow = await userModel.findByEmail(email);

    // Deliberately identical error for "no such user" and "wrong password"
    // so an attacker can't use this endpoint to enumerate valid emails.
    const genericError = new UnauthorizedError('Invalid email or password');

    if (!userRow) throw genericError;

    const validPassword = await verifyPassword(password, userRow.password_hash);
    if (!validPassword) throw genericError;

    const user = {
      id: userRow.id,
      email: userRow.email,
      displayName: userRow.display_name,
      createdAt: userRow.created_at,
    };

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    res.json({ success: true, data: { user, accessToken, refreshToken } });
  })
);

router.post(
  '/refresh',
  authLimiter,
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await userModel.findById(payload.sub);
    if (!user) throw new UnauthorizedError('User no longer exists');

    // Rotate: revoke the old refresh token and issue a new one. This limits
    // how long a stolen (but not-yet-used) refresh token remains valid.
    await revokeRefreshToken(refreshToken);
    const newRefreshToken = await issueRefreshToken(user.id);
    const accessToken = signAccessToken(user);

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  })
);

router.post(
  '/logout',
  requireAuth,
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.body.refreshToken);
    res.json({ success: true, data: { message: 'Logged out' } });
  })
);

// "Log out everywhere" -- revokes every refresh token for the account,
// useful if the user suspects their credentials were compromised.
router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeAllUserTokens(req.user.id);
    res.json({ success: true, data: { message: 'Logged out of all devices' } });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await userModel.findById(req.user.id);
    res.json({ success: true, data: { user } });
  })
);

module.exports = router;
