import { encrypt, decrypt, maskSecret, hashPassword, verifyPassword } from '../encryption.util';

describe('Encryption Utility', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-min-32-chars';
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'test-value';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('maskSecret', () => {
    it('should mask a secret string', () => {
      const secret = 'sk-1234567890abcdef';
      const masked = maskSecret(secret, 4);
      expect(masked).toBe('sk-1...cdef');
    });

    it('should handle short strings', () => {
      const secret = 'short';
      const masked = maskSecret(secret, 4);
      expect(masked).toBe('*****');
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify a password', () => {
      const password = 'MySecurePassword123!';
      const hash = hashPassword(password);
      const isValid = verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'correct';
      const hash = hashPassword(password);
      const isValid = verifyPassword('wrong', hash);
      expect(isValid).toBe(false);
    });
  });
});
