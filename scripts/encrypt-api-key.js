#!/usr/bin/env node
/**
 * Encrypt ISS Manager API Key for Production Seed
 * Usage: ENCRYPTION_KEY="<key>" node scripts/encrypt-api-key.js "<plaintext>"
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function encrypt(plaintext, encryptionKey) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Derive 256-bit key (same as production)
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Get plaintext from command line
const plaintext = process.argv[2];
const encryptionKey = process.env.ENCRYPTION_KEY;

if (!plaintext) {
  console.error(
    'Usage: ENCRYPTION_KEY="<key>" node encrypt-api-key.js "<plaintext>"'
  );
  process.exit(1);
}

try {
  const encrypted = encrypt(plaintext, encryptionKey);
  console.log(encrypted);
} catch (error) {
  console.error('Encryption failed:', error.message);
  process.exit(1);
}
