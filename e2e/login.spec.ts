import { test, expect } from "@playwright/test";
import { E2E_OPERATOR, login } from "./_helpers";

test.describe("login flow", () => {
  test("anonymous request to / redirects to /giris with ?next=", async ({ page }) => {
    const response = await page.goto("/");
    expect(page.url()).toContain("/giris");
    expect(page.url()).toContain("next=");
    expect(response?.ok() || response?.status() === 200 || response?.status() === 307).toBeTruthy();
  });

  test("invalid credentials show an error message and do not set the session cookie", async ({
    page,
    context,
  }) => {
    await page.goto("/giris");
    await page.getByLabel("E-posta").fill("e2e-operator@example.invalid");
    await page.getByLabel("Parola").fill("wrong-password");
    await page.getByRole("button", { name: /giriş|gir/i }).click();
    await expect(page.locator("body")).toContainText(/hata|geçersiz|hatalı|invalid/i, {
      timeout: 5_000,
    });
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "crmanaliz.sess")).toBeUndefined();
    expect(page.url()).toContain("/giris");
  });

  test("valid credentials land on / and set the HttpOnly session cookie", async ({
    page,
    context,
  }) => {
    await login(page, E2E_OPERATOR);
    const cookies = await context.cookies();
    const sess = cookies.find((c) => c.name === "crmanaliz.sess");
    expect(sess).toBeDefined();
    expect(sess?.httpOnly).toBe(true);
  });
});
