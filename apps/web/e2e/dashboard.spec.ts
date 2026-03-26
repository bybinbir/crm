import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('dashboard loads with sidebar navigation', async ({ page }) => {
    // Sidebar should be visible
    const sidebar = page.locator('[data-testid="sidebar"], nav, aside');
    await expect(sidebar.first()).toBeVisible();

    // Check for main navigation items (8 modules as per spec)
    const expectedModules = [
      /Ana Sayfa|Dashboard|Anasayfa/i,
      /Mahalle Kalite|Neighborhood/i,
      /Karar Destek|Decision/i,
      /Rapor|Report/i,
      /Entegrasyon|Integration/i,
      /Audit|Denetim/i,
      /Kullanıcı|User/i,
      /Ayar|Setting/i,
    ];

    // At least 6 of 8 modules should be visible (some might be admin-only)
    let visibleModules = 0;
    for (const module of expectedModules) {
      const count = await page.locator(`text=${module}`).count();
      if (count > 0) visibleModules++;
    }

    expect(visibleModules).toBeGreaterThanOrEqual(6);
  });

  test('navigate to integrations page', async ({ page }) => {
    await page.click('text=/Entegrasyon|Integration/i');
    await expect(page).toHaveURL(/\/integrations/, { timeout: 10000 });
    await expect(page.locator('h1, h2')).toContainText(
      /Entegrasyon|Integration/i
    );
  });

  test('navigate to audit logs page', async ({ page }) => {
    await page.click('text=/Audit|Denetim/i');
    await expect(page).toHaveURL(/\/audit/, { timeout: 10000 });
    await expect(page.locator('h1, h2')).toContainText(/Audit|Denetim/i);
  });

  test('navigate to users page', async ({ page }) => {
    await page.click('text=/Kullanıcı|User/i');
    await expect(page).toHaveURL(/\/user/, { timeout: 10000 });
  });

  test('navigate to reports page', async ({ page }) => {
    await page.click('text=/Rapor|Report/i');
    await expect(page).toHaveURL(/\/report/, { timeout: 10000 });
  });

  test('navigate to decision support page', async ({ page }) => {
    await page.click('text=/Karar Destek|Decision/i');
    await expect(page).toHaveURL(/\/decision/, { timeout: 10000 });
  });

  test('navigate to neighborhood quality page', async ({ page }) => {
    await page.click('text=/Mahalle Kalite|Neighborhood/i');
    await expect(page).toHaveURL(/\/neighborhood|mahalle/, { timeout: 10000 });
  });

  test('navigate to settings page', async ({ page }) => {
    await page.click('text=/Ayar|Setting/i');
    await expect(page).toHaveURL(/\/setting/, { timeout: 10000 });
  });
});
