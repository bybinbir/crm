#!/usr/bin/env tsx
/**
 * crmanaliz user seeder.
 *
 * Usage:
 *   pnpm tsx scripts/seed-user.ts admin@example.com correcthorsebatterystaple operator
 *
 * Creates (or updates) a user row in `kullanicilar`. Safe to re-run —
 * existing emails get their password+role overwritten.
 *
 * The role MUST be one of: operator | analyst | viewer.
 */
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb, schema } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { isRole } from "@/lib/auth/roles";

async function main(): Promise<void> {
  const [, , email, password, roleArg] = process.argv;
  if (!email || !password || !roleArg) {
    process.stderr.write(
      "usage: seed-user.ts <email> <password> <operator|analyst|viewer>\n"
    );
    process.exit(2);
  }
  if (!isRole(roleArg)) {
    process.stderr.write(`bad role: ${roleArg}\n`);
    process.exit(2);
  }

  const passwordHash = hashPassword(password);
  const db = getDb();

  await db
    .insert(schema.kullanicilar)
    .values({ email, passwordHash, role: roleArg })
    .onConflictDoUpdate({
      target: schema.kullanicilar.email,
      set: {
        passwordHash: sql`EXCLUDED.password_hash`,
        role: sql`EXCLUDED.role`,
      },
    });

  const [row] = await db
    .select({ id: schema.kullanicilar.id, email: schema.kullanicilar.email, role: schema.kullanicilar.role })
    .from(schema.kullanicilar)
    .where(eq(schema.kullanicilar.email, email))
    .limit(1);

  process.stdout.write(
    JSON.stringify({ ok: true, user: row }) + "\n"
  );
  await closeDb();
}

main().catch(async (e) => {
  process.stderr.write(`seed-user failed: ${e instanceof Error ? e.message : String(e)}\n`);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
