import { expect, type Page } from "@playwright/test";

export const E2E_OPERATOR = {
  email: "e2e-operator@example.invalid",
  password: "operator-pw-12345",
};

export const E2E_VIEWER = {
  email: "e2e-viewer@example.invalid",
  password: "viewer-pw-12345",
};

/**
 * Fill and submit the /giris form. Asserts redirect to `expectedPath`
 * (default "/") on success.
 */
export async function login(
  page: Page,
  user: { email: string; password: string },
  expectedPath = "/"
): Promise<void> {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Parola").fill(user.password);
  await page.getByRole("button", { name: /giriş|gir/i }).click();
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 10_000 });
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(expectedPath)}$`));
}

export async function logout(page: Page): Promise<void> {
  await page.goto("/cikis");
  await page.waitForURL((url) => url.pathname === "/giris" || url.pathname === "/", {
    timeout: 5_000,
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
