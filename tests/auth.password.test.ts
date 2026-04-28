import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("rejects passwords shorter than 8 chars", () => {
    expect(() => hashPassword("short")).toThrow();
  });

  it("hash + verify round-trip", () => {
    const stored = hashPassword("correcthorsebattery");
    expect(stored).toMatch(/^scrypt\$/);
    expect(verifyPassword("correcthorsebattery", stored)).toBe(true);
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("each call produces a unique hash (random salt)", () => {
    const a = hashPassword("samepassword");
    const b = hashPassword("samepassword");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored values", () => {
    expect(verifyPassword("any", "")).toBe(false);
    expect(verifyPassword("any", "bcrypt$something")).toBe(false);
    expect(verifyPassword("any", "scrypt$only$two")).toBe(false);
  });
});
