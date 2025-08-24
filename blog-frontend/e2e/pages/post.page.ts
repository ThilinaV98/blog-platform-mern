import { Page, Locator } from '@playwright/test';

export class PostPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly contentEditor: Locator;
  readonly excerptInput: Locator;
  readonly categorySelect: Locator;
  readonly tagsInput: Locator;
  readonly coverImageUpload: Locator;
  readonly saveButton: Locator;
  readonly publishButton: Locator;
  readonly deleteButton: Locator;
  readonly backButton: Locator;
  
  // Rich text editor toolbar
  readonly boldButton: Locator;
  readonly italicButton: Locator;
  readonly headingButton: Locator;
  readonly linkButton: Locator;
  readonly imageButton: Locator;
  readonly codeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form fields
    this.titleInput = page.getByLabel(/title/i);
    this.contentEditor = page.locator('[data-testid="content-editor"]');
    this.excerptInput = page.getByLabel(/excerpt/i);
    this.categorySelect = page.getByLabel(/category/i);
    this.tagsInput = page.getByLabel(/tags/i);
    this.coverImageUpload = page.getByLabel(/cover image/i);
    
    // Actions
    this.saveButton = page.getByRole('button', { name: /save draft/i });
    this.publishButton = page.getByRole('button', { name: /publish/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.backButton = page.getByRole('link', { name: /back/i });
    
    // Editor toolbar
    this.boldButton = page.getByRole('button', { name: /bold/i });
    this.italicButton = page.getByRole('button', { name: /italic/i });
    this.headingButton = page.getByRole('button', { name: /heading/i });
    this.linkButton = page.getByRole('button', { name: /link/i });
    this.imageButton = page.getByRole('button', { name: /image/i });
    this.codeButton = page.getByRole('button', { name: /code/i });
  }

  async gotoNew() {
    await this.page.goto('/dashboard/posts/new');
  }

  async gotoEdit(postId: string) {
    await this.page.goto(`/dashboard/posts/${postId}/edit`);
  }

  async fillPostForm(data: {
    title: string;
    content: string;
    excerpt?: string;
    category?: string;
    tags?: string[];
  }) {
    await this.titleInput.fill(data.title);
    await this.contentEditor.fill(data.content);
    
    if (data.excerpt) {
      await this.excerptInput.fill(data.excerpt);
    }
    
    if (data.category) {
      await this.categorySelect.selectOption(data.category);
    }
    
    if (data.tags) {
      for (const tag of data.tags) {
        await this.tagsInput.fill(tag);
        await this.page.keyboard.press('Enter');
      }
    }
  }

  async uploadCoverImage(filePath: string) {
    await this.coverImageUpload.setInputFiles(filePath);
  }

  async formatText(format: 'bold' | 'italic' | 'heading' | 'code') {
    switch (format) {
      case 'bold':
        await this.boldButton.click();
        break;
      case 'italic':
        await this.italicButton.click();
        break;
      case 'heading':
        await this.headingButton.click();
        break;
      case 'code':
        await this.codeButton.click();
        break;
    }
  }

  async insertLink(url: string, text?: string) {
    await this.linkButton.click();
    await this.page.getByPlaceholder(/url/i).fill(url);
    if (text) {
      await this.page.getByPlaceholder(/link text/i).fill(text);
    }
    await this.page.getByRole('button', { name: /insert/i }).click();
  }

  async saveDraft() {
    await this.saveButton.click();
    await this.page.waitForSelector('[data-testid="save-success"]', { state: 'visible' });
  }

  async publish() {
    await this.publishButton.click();
    // Confirm publish dialog
    await this.page.getByRole('button', { name: /confirm publish/i }).click();
    await this.page.waitForURL('/dashboard/posts');
  }

  async deletePost() {
    await this.deleteButton.click();
    // Confirm delete dialog
    await this.page.getByRole('button', { name: /confirm delete/i }).click();
    await this.page.waitForURL('/dashboard/posts');
  }

  async expectTitle(title: string) {
    await this.page.waitForFunction(
      (expectedTitle) => {
        const input = document.querySelector('input[name="title"]') as HTMLInputElement;
        return input?.value === expectedTitle;
      },
      title
    );
  }

  async expectContent(content: string) {
    await this.page.waitForFunction(
      (expectedContent) => {
        const editor = document.querySelector('[data-testid="content-editor"]');
        return editor?.textContent?.includes(expectedContent);
      },
      content
    );
  }

  async expectSuccessMessage(message: string | RegExp) {
    await this.page.getByText(message).waitFor({ state: 'visible' });
  }

  async expectErrorMessage(message: string | RegExp) {
    await this.page.locator('.bg-red-50').getByText(message).waitFor({ state: 'visible' });
  }
}