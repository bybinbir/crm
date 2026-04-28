/**
 * Cookie-based session — minimal, server-only.
 *
 * M3 scope: a single cookie carries `{ role, kullaniciId, exp }` HMAC-signed
 * with `PII_MASTER_KEY` (re-uses the existing master key; M4'te dedikated
 * `SESSION_SIGNING_KEY` ayrılır). Cookies set with `HttpOnly`, `SameSite=Lax`,
 * `Secure` in production.
 *
 * No login form yet — the session is provisioned via the (also TODO) admin
 * console or a CLI seed. For dev convenience, `DEV_FORCE_ROLE` env can
 * shortcut the cookie (ONLY in NODE_ENV=development, ONLY readable on
 * localhost). This is a deliberate ergonomic concession; production code
 * never honours it.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { Buffer } from "node:buffer";
import { config } from "@/lib/config";
import { isRole, type Role } from "./roles";

const COOKIE_NAME = "crmanaliz.sess";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type Session = {
  kullaniciId: string;
  role: Role;
  exp: number; // epoch ms
};

/**
 * Reads the session from the request cookie. Returns null if no session,
 * cookie expired, signature invalid, or role unknown.
 *
 * Dev-only fallback: when NODE_ENV=development AND DEV_FORCE_ROLE env is
 * set, fabricate a session so the dev pages don't 403.
 */
export async function getSession(): Promise<Session | null> {
  // Dev convenience.
  if (config.nodeEnv === "development") {
    const forced = process.env["DEV_FORCE_ROLE"];
    if (forced && isRole(forced)) {
      return {
        kullaniciId: "dev",
        role: forced,
        exp: Date.now() + SESSION_TTL_MS,
      };
    }
  }

  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verify(raw);
}

/**
 * Issue and persist a new session cookie. Caller (a Server Action) is
 * responsible for verifying credentials before calling this.
 */
export async function setSession(s: Omit<Session, "exp">): Promise<void> {
  const session: Session = { ...s, exp: Date.now() + SESSION_TTL_MS };
  const value = sign(session);
  const isProd = config.nodeEnv === "production";
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: new Date(session.exp),
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Get the caller's IP from the standard reverse-proxy header, or null.
 * Used by audit logging, NOT by access control.
 */
export async function getCallerIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/* ─── HMAC sign / verify ──────────────────────────────────────────────── */

function sign(session: Session): string {
  const payload = base64url(Buffer.from(JSON.stringify(session)));
  const sig = base64url(hmac(payload));
  return `${payload}.${sig}`;
}

function verify(token: string): Session | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = base64url(hmac(payload));
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let session: unknown;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    !session ||
    typeof session !== "object" ||
    typeof (session as { kullaniciId?: unknown }).kullaniciId !== "string" ||
    typeof (session as { exp?: unknown }).exp !== "number" ||
    !isRole((session as { role?: unknown }).role)
  ) {
    return null;
  }

  const s = session as Session;
  if (s.exp < Date.now()) return null;
  return s;
}

function hmac(payload: string): Buffer {
  const key = Buffer.from(config.piiMasterKeyHex, "hex");
  return createHmac("sha256", key).update(payload).digest();
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}
