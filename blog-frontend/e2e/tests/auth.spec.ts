import { test, expect } from '../fixtures/test';
import { generateUser, testUsers } from '../helpers/test-data';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
  });

  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ page, authPage }) => {
      const newUser = generateUser();
      
      await authPage.goto('register');
      await authPage.register(
        newUser.email,
        newUser.username,
        newUser.password,
        newUser.displayName
      );
      
      await authPage.expectRegisterSuccess();
      
      // Verify user is logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show validation errors for weak password', async ({ page, authPage }) => {
      await authPage.goto('register');
      
      await page.getByLabel(/^email$/i).fill('test@example.com');
      await page.getByLabel(/^username$/i).fill('testuser');
      await page.getByLabel(/^password$/i).fill('weak');
      await page.getByLabel(/confirm password/i).fill('weak');
      
      await authPage.registerButton.click();
      
      await authPage.expectError(/password must be at least 8 characters/i);
    });

    test('should show error for mismatched passwords', async ({ page, authPage }) => {
      await authPage.goto('register');
      
      await page.getByLabel(/^email$/i).fill('test@example.com');
      await page.getByLabel(/^username$/i).fill('testuser');
      await page.getByLabel(/^password$/i).fill('Test123!@#');
      await page.getByLabel(/confirm password/i).fill('Different123!@#');
      
      await authPage.registerButton.click();
      
      await authPage.expectError(/passwords do not match/i);
    });

    test('should show error for duplicate email', async ({ page, authPage }) => {
      await authPage.goto('register');
      
      // Try to register with existing email
      await authPage.register(
        testUsers.author.email,
        'newusername',
        'Test123!@#'
      );
      
      await authPage.expectError(/email already exists/i);
    });

    test('should validate username format', async ({ page, authPage }) => {
      await authPage.goto('register');
      
      const invalidUsernames = ['user name', 'user@name', 'user.name', '123'];
      
      for (const username of invalidUsernames) {
        await page.getByLabel(/^username$/i).fill(username);
        await page.getByLabel(/^email$/i).click(); // Trigger validation
        
        const usernameInput = page.getByLabel(/^username$/i);
        const isValid = await usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
        
        expect(isValid).toBe(false);
      }
    });
  });

  test.describe('User Login', () => {
    test('should login with email successfully', async ({ page, authPage }) => {
      await authPage.goto('login');
      await authPage.login(testUsers.author.email, testUsers.author.password);
      
      await authPage.expectLoginSuccess();
      
      // Verify user menu is visible
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should login with username successfully', async ({ page, authPage }) => {
      await authPage.goto('login');
      await authPage.login(testUsers.author.username, testUsers.author.password);
      
      await authPage.expectLoginSuccess();
    });

    test('should show error for invalid credentials', async ({ page, authPage }) => {
      await authPage.goto('login');
      await authPage.login('wrong@example.com', 'wrongpassword');
      
      await authPage.expectError(/invalid credentials/i);
    });

    test('should persist session after page refresh', async ({ page, authPage }) => {
      await authPage.goto('login');
      await authPage.login(testUsers.author.email, testUsers.author.password);
      
      await authPage.expectLoginSuccess();
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should redirect to requested page after login', async ({ page, authPage }) => {
      // Try to access protected page
      await page.goto('/dashboard/posts/new');
      
      // Should redirect to login with redirect param
      await expect(page).toHaveURL(/\/login\?redirect=/);
      
      // Login
      await authPage.login(testUsers.author.email, testUsers.author.password);
      
      // Should redirect to originally requested page
      await expect(page).toHaveURL('/dashboard/posts/new');
    });

    test('should handle remember me checkbox', async ({ page, authPage }) => {
      await authPage.goto('login');
      
      // Check remember me
      await page.getByLabel(/remember me/i).check();
      
      await authPage.login(testUsers.author.email, testUsers.author.password);
      await authPage.expectLoginSuccess();
      
      // Close browser context and create new one to test persistence
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'refreshToken');
      
      // Should have longer expiry with remember me
      expect(authCookie).toBeDefined();
      if (authCookie) {
        const expiryDate = new Date(authCookie.expires * 1000);
        const daysDiff = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeGreaterThan(7); // Should be valid for more than 7 days
      }
    });
  });

  test.describe('User Logout', () => {
    test.beforeEach(async ({ page, authPage }) => {
      // Login before each logout test
      await authPage.goto('login');
      await authPage.login(testUsers.author.email, testUsers.author.password);
      await authPage.expectLoginSuccess();
    });

    test('should logout successfully', async ({ page, authPage }) => {
      await authPage.logout();
      
      // Should redirect to login page
      await expect(page).toHaveURL('/login');
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      // Should redirect back to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should clear all auth cookies on logout', async ({ page, authPage }) => {
      // Get cookies before logout
      const cookiesBefore = await page.context().cookies();
      expect(cookiesBefore.some(c => c.name === 'accessToken')).toBe(true);
      
      await authPage.logout();
      
      // Check cookies after logout
      const cookiesAfter = await page.context().cookies();
      expect(cookiesAfter.some(c => c.name === 'accessToken')).toBe(false);
      expect(cookiesAfter.some(c => c.name === 'refreshToken')).toBe(false);
    });
  });

  test.describe('Password Reset', () => {
    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/login');
      await page.getByText(/forgot your password/i).click();
      
      await expect(page).toHaveURL('/forgot-password');
      await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    });

    test('should send password reset email', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await page.getByLabel(/email/i).fill(testUsers.author.email);
      await page.getByRole('button', { name: /send reset link/i }).click();
      
      // Should show success message
      await expect(page.getByText(/reset link sent/i)).toBeVisible();
    });

    test('should show error for non-existent email', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByRole('button', { name: /send reset link/i }).click();
      
      // Should show error
      await expect(page.getByText(/email not found/i)).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected routes', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/dashboard/posts',
        '/dashboard/posts/new',
        '/dashboard/settings/profile',
        '/dashboard/settings/account',
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test('should allow access to public routes without auth', async ({ page }) => {
      const publicRoutes = [
        '/',
        '/blog',
        '/login',
        '/register',
        '/forgot-password',
      ];

      for (const route of publicRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(route);
      }
    });
  });

  test.describe('Session Management', () => {
    test('should refresh token automatically when expired', async ({ page, authPage }) => {
      await authPage.goto('login');
      await authPage.login(testUsers.author.email, testUsers.author.password);
      await authPage.expectLoginSuccess();
      
      // Mock token expiry by modifying cookie
      await page.context().addCookies([{
        name: 'accessToken',
        value: 'expired-token',
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 - 3600, // Expired 1 hour ago
      }]);
      
      // Make a request that requires auth
      await page.goto('/dashboard/posts');
      
      // Should still work (token refreshed automatically)
      await expect(page).toHaveURL('/dashboard/posts');
    });

    test('should handle concurrent sessions', async ({ browser, authPage }) => {
      // Create two browser contexts (simulating two devices)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Login on both devices
      await page1.goto('/login');
      await page1.getByLabel(/email or username/i).fill(testUsers.author.email);
      await page1.getByLabel(/^password$/i).fill(testUsers.author.password);
      await page1.getByRole('button', { name: /sign in/i }).click();
      await page1.waitForURL('/dashboard');
      
      await page2.goto('/login');
      await page2.getByLabel(/email or username/i).fill(testUsers.author.email);
      await page2.getByLabel(/^password$/i).fill(testUsers.author.password);
      await page2.getByRole('button', { name: /sign in/i }).click();
      await page2.waitForURL('/dashboard');
      
      // Both sessions should work
      await page1.goto('/dashboard/posts');
      await expect(page1).toHaveURL('/dashboard/posts');
      
      await page2.goto('/dashboard/settings/profile');
      await expect(page2).toHaveURL('/dashboard/settings/profile');
      
      // Cleanup
      await context1.close();
      await context2.close();
    });
  });
});