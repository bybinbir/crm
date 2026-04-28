import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required to run drizzle-kit. Copy .env.example to .env.local and fill it in."
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
