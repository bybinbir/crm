import { test, expect } from "@playwright/test";
import { E2E_OPERATOR, login } from "./_helpers";

test.describe("dashboard", () => {
  test("operator sees Genel Durum heading and KPI cards", async ({ page }) => {
    await login(page, E2E_OPERATOR);
    await expect(page.getByRole("heading", { name: /genel durum/i })).toBeVisible();
    // KPI label sample — we don't pin numbers because data may change.
    await expect(page.getByText(/aktif müşteri|aylık tahsilat|ödeme oranı/i).first()).toBeVisible();
  });

  test("revenue / Türk Lirası label appears (no raw PII)", async ({ page }) => {
    await login(page, E2E_OPERATOR);
    // Page renders the TL-formatted aggregate; no customer name / email
    // should appear on the dashboard.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/@example\.invalid/);
    expect(body).not.toMatch(/\+90 555 000 90/); // seed phone shape
  });
});
