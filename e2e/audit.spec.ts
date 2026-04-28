import { test, expect } from "@playwright/test";
import { E2E_OPERATOR, login } from "./_helpers";

test.describe("audit log UI", () => {
  test("operator can list audit events", async ({ page }) => {
    await login(page, E2E_OPERATOR);
    await page.goto("/yonetim/denetim");
    await expect(page.getByRole("heading", { name: /denetim günlüğü/i })).toBeVisible();
    // Either a table or the empty state — both are acceptable smoke
    // outcomes against a freshly seeded DB.
    await expect(page.locator("body")).toContainText(/zaman|kullanıcı|aksiyon|kaynak|sonuç|kayıt/i);
  });

  test("filter form preserves typed values across submit", async ({ page }) => {
    await login(page, E2E_OPERATOR);
    await page.goto("/yonetim/denetim");
    await page.getByLabel("Aksiyon").fill("login.success");
    await page.getByRole("button", { name: /filtrele/i }).click();
    await expect(page).toHaveURL(/aksiyon=login\.success/);
    await expect(page.getByLabel("Aksiyon")).toHaveValue("login.success");
  });

  test("URL with malformed page param is clamped, not 500", async ({ page }) => {
    await login(page, E2E_OPERATOR);
    const r = await page.goto("/yonetim/denetim?page=-1&pageSize=10000000&aksiyon=" + "x".repeat(500));
    expect(r?.status()).toBeLessThan(500);
    // Page should still render the table heading.
    await expect(page.getByRole("heading", { name: /denetim günlüğü/i })).toBeVisible();
  });

  test("audit page must not surface PII fields (isim/soyisim/telefon/email/adres)", async ({
    page,
  }) => {
    await login(page, E2E_OPERATOR);
    await page.goto("/yonetim/denetim");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/@example\.invalid/);
    expect(body).not.toMatch(/\+90 555/);
    expect(body).not.toMatch(/\bAd\d+\s+Soyad\d+/i); // seed name shape
  });
});
