const { hashPassword, verifyPassword } = require('../src/utils/password');

describe('password utils', () => {
  it('hashes a password to something other than the plaintext', async () => {
    const hash = await hashPassword('correcthorsebattery1');
    expect(hash).not.toEqual('correcthorsebattery1');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correcthorsebattery1');
    const result = await verifyPassword('correcthorsebattery1', hash);
    expect(result).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correcthorsebattery1');
    const result = await verifyPassword('wrongpassword1', hash);
    expect(result).toBe(false);
  });

  it('produces different hashes for the same password (unique salts)', async () => {
    const hashA = await hashPassword('samepassword1');
    const hashB = await hashPassword('samepassword1');
    expect(hashA).not.toEqual(hashB);
  });
});
