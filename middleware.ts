/**
 * Route protection — every page except /giris and Next internals
 * requires a valid session cookie. Lightweight check (cookie presence
 * only); the real signature/expiry check happens in the page (via
 * `getSession()` → which our middleware can't run because it's HMAC).
 *
 * Trade-off: a forged cookie passes middleware but fails inside
 * `requireSession()` in the page → user gets a 401 from the AuthError
 * boundary instead of /giris. That's acceptable; this middleware exists
 * for the common case (no cookie at all → straight to /giris).
 */
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set<string>(["/giris"]);
const COOKIE_NAME = "crmanaliz.sess";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Always allow the login route, the API export endpoint (it does its
  // own RBAC check), Next.js internals, and static assets.
  if (
    PUBLIC.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/cikis") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const hasCookie = request.cookies.get(COOKIE_NAME);
  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
