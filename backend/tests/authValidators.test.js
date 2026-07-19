const { registerSchema, loginSchema } = require('../src/validators/authValidators');

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'Student@Example.com',
      displayName: 'Umair',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    // Email should be normalized to lowercase.
    expect(result.data.email).toBe('student@example.com');
  });

  it('rejects a password without a number', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      displayName: 'Umair',
      password: 'passwordonly',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      displayName: 'Umair',
      password: 'p1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      displayName: 'Umair',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a display name that is too short', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      displayName: 'U',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login credentials', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});
