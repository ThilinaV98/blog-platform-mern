import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly newPostButton: Locator;
  readonly postsTab: Locator;
  readonly settingsTab: Locator;
  readonly profileTab: Locator;
  readonly postsList: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Navigation
    this.newPostButton = page.getByRole('link', { name: /new post/i });
    this.postsTab = page.getByRole('link', { name: /^posts$/i });
    this.settingsTab = page.getByRole('link', { name: /settings/i });
    this.profileTab = page.getByRole('link', { name: /profile/i });
    
    // Posts list
    this.postsList = page.locator('[data-testid="posts-list"]');
    this.searchInput = page.getByPlaceholder(/search posts/i);
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async navigateToNewPost() {
    await this.newPostButton.click();
    await this.page.waitForURL('/dashboard/posts/new');
  }

  async navigateToPosts() {
    await this.postsTab.click();
    await this.page.waitForURL('/dashboard/posts');
  }

  async navigateToSettings() {
    await this.settingsTab.click();
    await this.page.waitForURL(/\/dashboard\/settings/);
  }

  async navigateToProfile() {
    await this.profileTab.click();
    await this.page.waitForURL('/dashboard/settings/profile');
  }

  async searchPosts(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async openPost(title: string) {
    await this.page.getByRole('link', { name: title }).click();
  }

  async editPost(title: string) {
    const postCard = this.page.locator('article').filter({ hasText: title });
    await postCard.getByRole('button', { name: /edit/i }).click();
  }

  async deletePost(title: string) {
    const postCard = this.page.locator('article').filter({ hasText: title });
    await postCard.getByRole('button', { name: /delete/i }).click();
    // Confirm deletion
    await this.page.getByRole('button', { name: /confirm/i }).click();
  }

  async expectPostInList(title: string) {
    await this.page.getByText(title).waitFor({ state: 'visible' });
  }

  async expectPostNotInList(title: string) {
    await this.page.getByText(title).waitFor({ state: 'hidden' });
  }
}