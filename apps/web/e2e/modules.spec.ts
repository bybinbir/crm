import { test, expect } from '@playwright/test';

test.describe('Module Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('audit logs page has filter functionality', async ({ page }) => {
    await page.goto('/dashboard/audit-logs');

    // Check for filter inputs
    const filters = page.locator('input, select').filter({
      hasText: /Filtre|Filter|Search|Ara/i,
    });
    expect(await filters.count()).toBeGreaterThan(0);
  });

  test('integrations page displays ISSmanager section', async ({ page }) => {
    await page.goto('/dashboard/integrations/issmanager');

    // Should have integration content
    await expect(
      page.locator('text=/ISSmanager|Entegrasyon|Integration/i')
    ).toBeVisible({ timeout: 10000 });

    // Should have action buttons or forms
    const actionElements = await page
      .locator('button, input, [role="button"]')
      .count();
    expect(actionElements).toBeGreaterThan(0);
  });

  test('users page loads user list or form', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Check for user-related content
    const hasTable = (await page.locator('table').count()) > 0;
    const hasUserCard =
      (await page.locator('[data-testid*="user"]').count()) > 0;
    const hasAddButton =
      (await page.locator('text=/Ekle|Add|Yeni/i').count()) > 0;

    // At least one of these should be present
    expect(hasTable || hasUserCard || hasAddButton).toBeTruthy();
  });

  test('reports page displays report cards or list', async ({ page }) => {
    await page.goto('/dashboard/reports');

    // Should have report-related content
    await expect(
      page.locator('h1, h2').filter({ hasText: /Rapor|Report/i })
    ).toBeVisible({ timeout: 10000 });

    // Check for report elements
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasMetrics =
      (await page.locator('[class*="metric"], [class*="stat"]').count()) > 0;

    expect(hasCards || hasMetrics).toBeTruthy();
  });

  test('decision support page shows recommendations or analytics', async ({
    page,
  }) => {
    await page.goto('/dashboard/decision-support');

    // Should have decision support content
    await expect(
      page.locator('text=/Karar|Decision|Öneri|Recommendation/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('neighborhood quality page shows scoring interface', async ({
    page,
  }) => {
    await page.goto('/dashboard/neighborhood-quality');

    // Should have neighborhood/quality related content
    await expect(
      page.locator('text=/Mahalle|Neighborhood|Kalite|Quality|Skor|Score/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('settings page has configuration options', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // Should have settings content
    await expect(
      page.locator('text=/Ayar|Setting|Yapılandır|Configure/i')
    ).toBeVisible({ timeout: 10000 });
  });
});
