const { z } = require('zod');

// Password policy: 8+ chars, at least one letter and one number.
// Deliberately not requiring special characters -- research (NIST 800-63B)
// shows length matters far more than complexity rules for real-world security,
// and overly strict rules push users toward predictable substitutions.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be under 72 characters') // bcrypt's hard limit
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').max(255),
  displayName: z.string().trim().min(2).max(60),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
