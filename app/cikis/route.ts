/**
 * GET/POST /cikis — clears the session cookie and redirects to /giris.
 */
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handler(): Promise<Response> {
  await clearSession();
  return NextResponse.redirect(new URL("/giris", "http://localhost"));
}

export { handler as GET, handler as POST };
