import { Page, Locator } from '@playwright/test';

export class BlogPage {
  readonly page: Page;
  readonly postCards: Locator;
  readonly loadMoreButton: Locator;
  readonly categoryFilter: Locator;
  readonly searchInput: Locator;
  readonly sortDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Blog elements
    this.postCards = page.locator('article');
    this.loadMoreButton = page.getByRole('button', { name: /load more/i });
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.searchInput = page.getByPlaceholder(/search blog posts/i);
    this.sortDropdown = page.locator('select[name="sort"]');
  }

  async goto() {
    await this.page.goto('/blog');
  }

  async openPost(title: string) {
    await this.page.getByRole('heading', { name: title }).click();
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
  }

  async searchPosts(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async sortBy(option: 'latest' | 'popular' | 'trending') {
    await this.sortDropdown.selectOption(option);
  }

  async loadMorePosts() {
    await this.loadMoreButton.click();
  }

  async expectPostCount(count: number) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const articles = document.querySelectorAll('article');
        return articles.length === expectedCount;
      },
      count,
      { timeout: 5000 }
    );
  }

  async expectPostVisible(title: string) {
    await this.page.getByRole('heading', { name: title }).waitFor({ state: 'visible' });
  }

  async expectPostNotVisible(title: string) {
    await this.page.getByRole('heading', { name: title }).waitFor({ state: 'hidden' });
  }

  async expectCategory(postTitle: string, category: string) {
    const postCard = this.postCards.filter({ hasText: postTitle });
    await postCard.getByText(category).waitFor({ state: 'visible' });
  }

  async likePost(title: string) {
    const postCard = this.postCards.filter({ hasText: title });
    await postCard.getByRole('button', { name: /like/i }).click();
  }

  async sharePost(title: string) {
    const postCard = this.postCards.filter({ hasText: title });
    await postCard.getByRole('button', { name: /share/i }).click();
  }
}