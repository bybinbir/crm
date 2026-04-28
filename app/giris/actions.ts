"use server";

/**
 * Login Server Action — verifies credentials against `kullanicilar`,
 * provisions the cookie session, and redirects.
 *
 * Audit: every attempt (success or fail) records into `audit_events`.
 * On failure we DO NOT distinguish "no such user" from "wrong password"
 * in the response — same generic message to avoid email enumeration.
 */
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { logger } from "@/lib/logger";
import { setSession, getCallerIp } from "@/lib/auth/session";
import { isRole } from "@/lib/auth/roles";
import { verifyPassword } from "@/lib/auth/password";

const FormSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta giriniz"),
  password: z.string().min(8, "Parola en az 8 karakter olmalı"),
  next: z.string().optional(),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = FormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form",
    };
  }
  const { email, password, next } = parsed.data;

  let outcome: "success" | "error" = "error";
  let userIdForSession: string | null = null;
  let role: string | null = null;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        id: schema.kullanicilar.id,
        email: schema.kullanicilar.email,
        passwordHash: schema.kullanicilar.passwordHash,
        role: schema.kullanicilar.role,
      })
      .from(schema.kullanicilar)
      .where(eq(schema.kullanicilar.email, email))
      .limit(1);

    if (row && verifyPassword(password, row.passwordHash) && isRole(row.role)) {
      userIdForSession = String(row.id);
      role = row.role;
      outcome = "success";
      await db
        .update(schema.kullanicilar)
        .set({ sonGiris: sql`NOW()` })
        .where(eq(schema.kullanicilar.id, row.id));
    }
  } catch (e) {
    logger.error(
      { err: e instanceof Error ? e.message : String(e) },
      "login DB error"
    );
  }

  await audit(email, outcome).catch(() => undefined);

  if (outcome !== "success" || !userIdForSession || !role || !isRole(role)) {
    return { ok: false, error: "E-posta veya parola hatalı." };
  }

  await setSession({ kullaniciId: userIdForSession, role });

  // Validate `next` to prevent open-redirect.
  const safeNext = isSafeRedirect(next) ? (next as string) : "/";
  redirect(safeNext);
}

async function audit(
  email: string,
  outcome: "success" | "error"
): Promise<void> {
  const db = getDb();
  const ip = await getCallerIp();
  await db.insert(schema.auditEvents).values({
    aksiyon: "login",
    kaynak: "/giris",
    sonuc: outcome,
    requestId: `email_len=${email.length}`,
    ip: ip ?? null,
  });
}

function isSafeRedirect(value: string | undefined): boolean {
  if (!value) return false;
  // Only allow same-origin paths.
  return value.startsWith("/") && !value.startsWith("//") && !value.includes(":");
}
