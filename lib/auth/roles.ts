/**
 * Role-based access control — 3 roles, capability-based checks.
 *
 *   - operator : full access; can see decrypted PII; can export.
 *   - analyst  : read-only on aggregate metrics + decrypted PII; cannot
 *                trigger pulls; cannot export.
 *   - viewer   : metric-only; PII (names, addresses, phones) hidden.
 *
 * The capability check (`can`) is the canonical gate — DON'T compare
 * roles directly in callers. New capabilities go in `Capability` and
 * `ROLE_CAPS` together so the matrix is in one place.
 */

export type Role = "operator" | "analyst" | "viewer";

export const ROLES: readonly Role[] = ["operator", "analyst", "viewer"] as const;

export type Capability =
  | "view:dashboard"
  | "view:karsilastir"
  | "view:musteriler"
  | "view:odenmemis"
  | "view:audit-log"
  | "decrypt:pii"
  | "export:csv"
  | "trigger:pull"
  | "admin:users";

const ROLE_CAPS: Record<Role, ReadonlySet<Capability>> = {
  operator: new Set<Capability>([
    "view:dashboard",
    "view:karsilastir",
    "view:musteriler",
    "view:odenmemis",
    "view:audit-log",
    "decrypt:pii",
    "export:csv",
    "trigger:pull",
    "admin:users",
  ]),
  analyst: new Set<Capability>([
    "view:dashboard",
    "view:karsilastir",
    "view:musteriler",
    "view:odenmemis",
    "decrypt:pii",
  ]),
  viewer: new Set<Capability>([
    "view:dashboard",
    "view:karsilastir",
  ]),
};

export function can(role: Role | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPS[role].has(cap);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Human-readable label for the role (Turkish UI strings). */
export const ROLE_LABEL: Record<Role, string> = {
  operator: "Operatör",
  analyst: "Analist",
  viewer: "İzleyici",
};
