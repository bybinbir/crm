import { describe, it, expect } from "vitest";
import { can, isRole, ROLES } from "@/lib/auth/roles";

describe("can()", () => {
  it("operator has every capability", () => {
    expect(can("operator", "view:dashboard")).toBe(true);
    expect(can("operator", "decrypt:pii")).toBe(true);
    expect(can("operator", "export:csv")).toBe(true);
    expect(can("operator", "trigger:pull")).toBe(true);
    expect(can("operator", "admin:users")).toBe(true);
  });

  it("analyst can view + decrypt PII but not export or pull", () => {
    expect(can("analyst", "view:dashboard")).toBe(true);
    expect(can("analyst", "decrypt:pii")).toBe(true);
    expect(can("analyst", "export:csv")).toBe(false);
    expect(can("analyst", "trigger:pull")).toBe(false);
    expect(can("analyst", "admin:users")).toBe(false);
  });

  it("viewer is restricted to aggregate dashboards", () => {
    expect(can("viewer", "view:dashboard")).toBe(true);
    expect(can("viewer", "view:karsilastir")).toBe(true);
    expect(can("viewer", "view:musteriler")).toBe(false);
    expect(can("viewer", "view:odenmemis")).toBe(false);
    expect(can("viewer", "decrypt:pii")).toBe(false);
    expect(can("viewer", "export:csv")).toBe(false);
  });

  it("returns false for unknown / null role", () => {
    expect(can(null, "view:dashboard")).toBe(false);
    expect(can(undefined, "view:dashboard")).toBe(false);
  });
});

describe("isRole()", () => {
  it("accepts the three known roles", () => {
    for (const r of ROLES) {
      expect(isRole(r)).toBe(true);
    }
  });
  it("rejects strangers", () => {
    expect(isRole("admin")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(42)).toBe(false);
  });
});
