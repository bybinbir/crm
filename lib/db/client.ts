/**
 * Database client — postgres-js + Drizzle.
 *
 * One pooled connection per Node process. The client is created lazily on
 * first use so that build steps (typecheck, lint) don't try to dial a
 * database. In tests, swap `getDb()` via the `__setDbForTests` hook.
 *
 * TLS posture: production requires `sslmode=require`. We log a warning if
 * the URL doesn't include it and `NODE_ENV === "production"`.
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

let cached: { client: postgres.Sql; db: Db } | undefined;
let testOverride: Db | undefined;

export function getDb(): Db {
  if (testOverride) return testOverride;
  if (cached) return cached.db;

  const url = config.databaseUrl;
  if (config.nodeEnv === "production" && !/sslmode=(require|verify-)/.test(url)) {
    logger.warn(
      "DATABASE_URL is missing sslmode=require in production — connections will be unencrypted."
    );
  }

  const client = postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
  });

  const db = drizzle(client, { schema });
  cached = { client, db };
  return db;
}

/** Close the pool. Call from graceful-shutdown hooks. */
export async function closeDb(): Promise<void> {
  if (!cached) return;
  await cached.client.end({ timeout: 5 });
  cached = undefined;
}

/** Test hook — swap the database without touching the real client. */
export function __setDbForTests(db: Db | undefined): void {
  testOverride = db;
}

export { schema };
