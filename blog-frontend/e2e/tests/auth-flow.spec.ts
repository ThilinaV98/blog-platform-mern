import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Authentication Flow', () => {
  const testUser = {
    email: faker.internet.email(),
    username: faker.internet.username(),
    password: 'TestPassword123!',
    displayName: faker.person.fullName(),
  };

  test('should complete registration and login flow', async ({ page }) => {
    // Go to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="displayName"]', testUser.displayName);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or login
    await page.waitForURL(/\/(dashboard|login)/);
    
    // If redirected to login, complete login flow
    if (page.url().includes('/login')) {
      await page.fill('input[name="emailOrUsername"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL(/\/dashboard/);
    }
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');
    
    // Verify redirect to home or login
    await page.waitForURL(/\/(login|$)/);
  });

  test('should handle invalid login gracefully', async ({ page }) => {
    await page.goto('/login');
    
    // Try to login with invalid credentials
    await page.fill('input[name="emailOrUsername"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Verify error message
    await expect(page.locator('text=/Invalid credentials|error/i')).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Enter email
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Verify confirmation message
    await expect(page.locator('text=/check your email|sent/i')).toBeVisible();
  });
});