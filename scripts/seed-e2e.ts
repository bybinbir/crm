#!/usr/bin/env tsx
/**
 * Deterministic, anonymised seed for the Playwright e2e suite.
 *
 * Goals:
 *   - 2 users:
 *       e2e-operator@example.invalid (password "operator-pw-12345", role operator)
 *       e2e-viewer@example.invalid   (password "viewer-pw-12345",   role viewer)
 *   - 5 customers (abone_no 9001..9005, anonymised "Test Müşteri N")
 *   - 30 invoices spread across 30 days, ~half unpaid
 *   - 10 audit events (login.success, export_odenmemis_csv, …)
 *
 * The seed is idempotent: running it twice produces the same DB state
 * (existing rows updated, no duplicates).
 *
 * NEVER use this in production. Aborts hard if NODE_ENV=production
 * unless `E2E_SEED_ALLOW_PROD` is explicitly set (we don't expose that).
 *
 * Usage:
 *   pnpm seed:e2e
 */
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb, schema } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { encryptString } from "@/lib/crypto/encrypt";

type SeedSummary = {
  users: number;
  customers: number;
  invoices: number;
  auditEvents: number;
};

async function main(): Promise<void> {
  if (process.env["NODE_ENV"] === "production") {
    process.stderr.write("seed-e2e refuses to run in production\n");
    process.exit(2);
  }

  const db = getDb();
  let users = 0;
  let customers = 0;
  let invoices = 0;
  let auditEvents = 0;

  /* ─── users ─────────────────────────────────────────────────────────── */
  const userSeed: Array<{ email: string; password: string; role: "operator" | "viewer" }> = [
    { email: "e2e-operator@example.invalid", password: "operator-pw-12345", role: "operator" },
    { email: "e2e-viewer@example.invalid", password: "viewer-pw-12345", role: "viewer" },
  ];
  for (const u of userSeed) {
    const passwordHash = hashPassword(u.password);
    await db
      .insert(schema.kullanicilar)
      .values({ email: u.email, passwordHash, role: u.role })
      .onConflictDoUpdate({
        target: schema.kullanicilar.email,
        set: {
          passwordHash: sql`EXCLUDED.password_hash`,
          role: sql`EXCLUDED.role`,
        },
      });
    users += 1;
  }

  /* ─── customers ─────────────────────────────────────────────────────── */
  const ilceler = ["Anamur", "Bozyazı", "Anamur", "Anamur", "Bozyazı"];
  const mahalleler = ["Gözce", "Bahçe", "Saray", "Mermerli", "Kalınören"];
  const paketler = ["100 Mbps", "50 Mbps", "200 Mbps", "100 Mbps", "50 Mbps"];

  for (let i = 0; i < 5; i++) {
    const aboneNo = String(9001 + i);
    const unvan = `Test Müşteri ${i + 1}`;
    const adres = `${mahalleler[i]} Mah. Test Cad. No:${i + 1} ${ilceler[i]}`;
    await db
      .insert(schema.musteriler)
      .values({
        aboneNo,
        isimEnc: encryptString(`Ad${i + 1}`),
        soyisimEnc: encryptString(`Soyad${i + 1}`),
        firmaUnvanEnc: encryptString(unvan),
        telefon1Enc: encryptString(`+90 555 000 90${i}0`),
        emailEnc: encryptString(`musteri${i + 1}@example.invalid`),
        ilce: ilceler[i] ?? null,
        mahalle: mahalleler[i] ?? null,
        paketAdi: paketler[i] ?? null,
      })
      .onConflictDoUpdate({
        target: schema.musteriler.aboneNo,
        set: {
          firmaUnvanEnc: sql`EXCLUDED.firma_unvan_enc`,
          ilce: sql`EXCLUDED.ilce`,
          mahalle: sql`EXCLUDED.mahalle`,
          paketAdi: sql`EXCLUDED.paket_adi`,
        },
      });
    customers += 1;
  }

  /* ─── invoices ──────────────────────────────────────────────────────── */
  const baseDay = new Date("2026-04-01T00:00:00.000Z");
  for (let i = 0; i < 30; i++) {
    const aboneNo = String(9001 + (i % 5));
    const faturaNo = `E2E-${String(i).padStart(4, "0")}`;
    const faturaTarihi = new Date(baseDay.getTime() + i * 24 * 60 * 60 * 1000);
    const sonOdemeTarihi = new Date(faturaTarihi.getTime() + 14 * 24 * 60 * 60 * 1000);
    const odendi = i % 2 === 0;
    const odendigiTarih = odendi ? new Date(sonOdemeTarihi.getTime() - 86_400_000) : null;
    const genelToplam = (100 + i * 10).toFixed(2);

    await db
      .insert(schema.faturalar)
      .values({
        aboneNo,
        faturaNo,
        genelToplam,
        faturaTarihi,
        sonOdemeTarihi,
        odendigiTarih,
        durum: odendi ? "Ödendi" : "Ödenmedi",
        kalemlerJson: "[]",
        unvanEnc: encryptString(`Test Müşteri ${(i % 5) + 1}`),
        adresEnc: encryptString(`Test Adres ${(i % 5) + 1}`),
      })
      .onConflictDoNothing({ target: schema.faturalar.faturaNo });
    invoices += 1;
  }

  /* ─── audit events ──────────────────────────────────────────────────── */
  // Wipe + reseed so the suite has a known baseline of 10 events.
  await db.execute(sql`DELETE FROM audit_events WHERE kaynak LIKE '/e2e/%' OR kullanici_id LIKE 'e2e-%'`);
  const actions: Array<{ aksiyon: string; sonuc: string; kaynak: string }> = [
    { aksiyon: "login.success", sonuc: "ok", kaynak: "/e2e/login" },
    { aksiyon: "login.fail", sonuc: "fail", kaynak: "/e2e/login" },
    { aksiyon: "export_odenmemis_csv", sonuc: "ok", kaynak: "/e2e/export" },
    { aksiyon: "export_odenmemis_xlsx", sonuc: "ok", kaynak: "/e2e/export" },
    { aksiyon: "export_odenmemis_pdf", sonuc: "ok", kaynak: "/e2e/export" },
    { aksiyon: "view.dashboard", sonuc: "ok", kaynak: "/e2e/dashboard" },
    { aksiyon: "view.audit", sonuc: "ok", kaynak: "/e2e/audit" },
    { aksiyon: "rbac.deny", sonuc: "fail", kaynak: "/e2e/rbac" },
    { aksiyon: "session.refresh", sonuc: "ok", kaynak: "/e2e/session" },
    { aksiyon: "logout", sonuc: "ok", kaynak: "/e2e/logout" },
  ];
  for (const a of actions) {
    await db.insert(schema.auditEvents).values({
      kullaniciId: "e2e-operator",
      aksiyon: a.aksiyon,
      kaynak: a.kaynak,
      sonuc: a.sonuc,
      requestId: `e2e-${a.aksiyon}`,
    });
    auditEvents += 1;
  }

  const summary: SeedSummary = { users, customers, invoices, auditEvents };
  process.stdout.write(JSON.stringify(summary) + "\n");
}

main()
  .then(async () => {
    await closeDb().catch(() => undefined);
    process.exit(0);
  })
  .catch(async (e) => {
    process.stderr.write(`seed-e2e failed: ${e instanceof Error ? e.message : String(e)}\n`);
    await closeDb().catch(() => undefined);
    process.exit(1);
  });
