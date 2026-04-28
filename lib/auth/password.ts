/**
 * Scrypt password hashing — N=2^14 stays under Node's default 32 MB
 * scrypt memory budget while still costing ~50ms per hash.
 *
 * Storage format:  scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const N = 1 << 14;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const MAX_MEM = 64 * 1024 * 1024;

export function hashPassword(plaintext: string): string {
  if (!plaintext || plaintext.length < 8) {
    throw new Error("Parola en az 8 karakter olmalı");
  }
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(plaintext, salt, KEY_LEN, { N, r: R, p: P, maxmem: MAX_MEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plaintext: string, stored: string): boolean {
  if (!stored.startsWith("scrypt$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(plaintext, salt, expected.length, { N: n, r, p, maxmem: MAX_MEM });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
