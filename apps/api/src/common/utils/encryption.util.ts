/**
 * Encryption Utility
 * Handles encryption and decryption of sensitive data (API keys, secrets)
 * Uses AES-256-GCM encryption
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * If not set, throws an error (mandatory for production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. This is required for encrypting sensitive data.',
    );
  }

  // Derive a 256-bit key from the provided key
  return crypto.scryptSync(key, 'salt', 32);
}

/**
 * Encrypt a plaintext string
 * Returns encrypted string in format: iv:authTag:encryptedData (hex encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:authTag:encryptedData (hex encoded)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask a sensitive string for display
 * Shows only first 4 and last 4 characters
 * Example: "sk-1234567890abcdef" -> "sk-1...cdef"
 */
export function maskSecret(secret: string, visibleChars = 4): string {
  if (!secret) {
    return '';
  }

  if (secret.length <= visibleChars * 2) {
    return '*'.repeat(secret.length);
  }

  const start = secret.substring(0, visibleChars);
  const end = secret.substring(secret.length - visibleChars);

  return `${start}...${end}`;
}

/**
 * Hash a password using bcrypt-like approach
 * Uses scrypt with random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');

  return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    throw new Error('Invalid stored hash format');
  }

  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');

  return hash === derivedHash;
}
