const { test, expect } = require('@playwright/test');

test('login page renders the basic sign-in form', async ({ page }) => {
  await page.goto('/pages/loginpage.html');

  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('#login-btn')).toHaveText('Login');
});

test('admin page renders the tenant dashboard shell', async ({ page }) => {
  await page.goto('/pages/hotel-motel-admin.html');

  await expect(page.locator('section[aria-label*="admin page"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Employees' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keys' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Key Status & History' })).toBeVisible();
});

test('settings page renders change password form', async ({ page }) => {
  await page.goto('/pages/settings.html');

  await expect(page.locator('#profile-form')).toBeVisible();
  await expect(page.locator('#change-password-form')).toBeVisible();
  await expect(page.locator('#profile-full-name')).toBeVisible();
  await expect(page.locator('#profile-position')).toBeVisible();
  await expect(page.locator('#current-password')).toBeVisible();
  await expect(page.locator('#new-password-settings')).toBeVisible();
  await expect(page.locator('#confirm-password')).toBeVisible();
  await expect(page.locator('#change-password-btn')).toHaveText('Update password');
});