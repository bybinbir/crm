import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh
    await page.goto('/login');
  });

  test('login page loads correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/CRM/i);
    await expect(page.locator('h2')).toContainText('CRM Analiz');
    await expect(
      page.locator('input[type="text"], input[type="email"]')
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.fill(
      'input[type="text"], input[type="email"]',
      'wrong@test.com'
    );
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(
      page.locator('text=/Invalid credentials|Geçersiz/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('login with valid credentials redirects to dashboard', async ({
    page,
  }) => {
    // Use demo admin credentials
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Dashboard should be visible
    await expect(page.locator('text=/Dashboard|Ana Sayfa/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('protected route redirects to login when not authenticated', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('logout clears session and redirects to login', async ({ page }) => {
    // Login first
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Find and click logout button
    // Could be in sidebar, header, or dropdown
    const logoutButton = page.locator('button, a').filter({
      hasText: /Çıkış|Logout/i,
    });
    await logoutButton.first().click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Try accessing protected route - should still redirect
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('page refresh maintains session', async ({ page }) => {
    // Login
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Refresh page
    await page.reload();

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=/Dashboard|Ana Sayfa/i')).toBeVisible({
      timeout: 10000,
    });
  });
});
