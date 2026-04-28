import { test, expect } from "@playwright/test";
import { E2E_OPERATOR, E2E_VIEWER, login } from "./_helpers";

test.describe("RBAC gates", () => {
  test("middleware redirects anonymous users to /giris", async ({ page }) => {
    await page.goto("/yonetim/denetim");
    expect(page.url()).toContain("/giris");
    expect(page.url()).toContain("next=");
  });

  test("operator can reach /yonetim/denetim", async ({ page }) => {
    await login(page, E2E_OPERATOR);
    const response = await page.goto("/yonetim/denetim");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: /denetim günlüğü/i })).toBeVisible();
  });

  test("viewer is denied access to /yonetim/denetim (403 or redirect)", async ({ page }) => {
    await login(page, E2E_VIEWER);
    const response = await page.goto("/yonetim/denetim", { waitUntil: "load" });
    const status = response?.status() ?? 200;
    // requireCapability throws AuthError(403) which Next surfaces as a
    // server-rendered error page; the page may still 200 but show the
    // error boundary. We accept either 403 OR a body that indicates
    // denial.
    if (status === 403) return;
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/yetkiniz yok|forbidden|403/i);
  });

  test("viewer cannot export odenmemis (export:csv capability)", async ({ page, request }) => {
    await login(page, E2E_VIEWER);
    const cookies = (await page.context().cookies())
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const r = await request.get("/api/export/odenmemis", {
      headers: { Cookie: cookies },
    });
    expect([401, 403]).toContain(r.status());
  });
});
