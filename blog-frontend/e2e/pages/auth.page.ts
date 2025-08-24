import { Page, Locator } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly displayNameInput: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Login form elements
    this.emailInput = page.getByLabel(/email or username/i);
    this.usernameInput = page.getByLabel(/^username$/i);
    this.passwordInput = page.getByLabel(/^password$/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.displayNameInput = page.getByLabel(/display name/i);
    
    // Buttons
    this.loginButton = page.getByRole('button', { name: /sign in/i });
    this.registerButton = page.getByRole('button', { name: /create account/i });
    
    // Messages
    this.errorMessage = page.locator('.bg-red-50').first();
    this.successMessage = page.locator('.bg-green-50').first();
  }

  async goto(path: 'login' | 'register' = 'login') {
    await this.page.goto(`/${path}`);
  }

  async login(emailOrUsername: string, password: string) {
    await this.emailInput.fill(emailOrUsername);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async register(email: string, username: string, password: string, displayName?: string) {
    await this.page.getByLabel(/^email$/i).fill(email);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    
    if (displayName) {
      await this.displayNameInput.fill(displayName);
    }
    
    await this.registerButton.click();
  }

  async expectLoginSuccess() {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  async expectRegisterSuccess() {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  async expectError(message: string | RegExp) {
    await this.errorMessage.waitFor({ state: 'visible' });
    if (typeof message === 'string') {
      await this.page.getByText(message).waitFor({ state: 'visible' });
    } else {
      await this.page.getByText(message).waitFor({ state: 'visible' });
    }
  }

  async logout() {
    // Click on user avatar dropdown
    await this.page.getByRole('button', { name: /user menu/i }).click();
    // Click logout
    await this.page.getByRole('menuitem', { name: /logout/i }).click();
    // Wait for redirect to login
    await this.page.waitForURL('/login');
  }
}