/**
 * Server-side guard helpers.
 *
 *   await requireCapability("export:csv");   // throws AuthError or NextResponse 403
 *
 * Use inside Server Components, Server Actions, and Route Handlers. The
 * thrown error propagates to Next's nearest error boundary; in Route
 * Handlers, prefer the explicit `Response.json({error}, {status: 403})`.
 */
import { getSession } from "./session";
import { can, type Capability, type Role } from "./roles";

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function requireSession(): Promise<{
  kullaniciId: string;
  role: Role;
}> {
  const s = await getSession();
  if (!s) throw new AuthError("Oturum bulunamadı.", 401);
  return { kullaniciId: s.kullaniciId, role: s.role };
}

export async function requireCapability(
  cap: Capability
): Promise<{ kullaniciId: string; role: Role }> {
  const sess = await requireSession();
  if (!can(sess.role, cap)) {
    throw new AuthError(`Bu işlem için yetkiniz yok (${cap}).`, 403);
  }
  return sess;
}

/**
 * Soft variant: returns null if not allowed, never throws. Useful for UI
 * decisions like "show export button only if allowed".
 */
export async function maybeCapability(
  cap: Capability
): Promise<{ kullaniciId: string; role: Role } | null> {
  const s = await getSession();
  if (!s || !can(s.role, cap)) return null;
  return { kullaniciId: s.kullaniciId, role: s.role };
}
