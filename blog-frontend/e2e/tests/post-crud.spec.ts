import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Post CRUD Operations', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Mock authentication or use test credentials
    await page.goto('/login');
    await page.fill('input[name="emailOrUsername"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test('should create and publish a new post', async ({ page }) => {
    const postData = {
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      excerpt: faker.lorem.paragraph(),
      category: 'Technology',
      tags: ['test', 'e2e', 'playwright'],
    };

    // Navigate to create post
    await page.goto('/dashboard/posts/new');
    
    // Fill post form
    await page.fill('input[name="title"]', postData.title);
    await page.fill('textarea[name="excerpt"]', postData.excerpt);
    
    // Fill rich text editor (simplified - actual implementation may vary)
    const editor = page.locator('[data-testid="rich-editor"]');
    await editor.click();
    await page.keyboard.type(postData.content);
    
    // Select category
    await page.selectOption('select[name="category"]', postData.category);
    
    // Add tags
    for (const tag of postData.tags) {
      await page.fill('input[name="tags"]', tag);
      await page.keyboard.press('Enter');
    }
    
    // Save as draft first
    await page.click('button:has-text("Save Draft")');
    await expect(page.locator('text=/saved|draft/i')).toBeVisible();
    
    // Publish post
    await page.click('button:has-text("Publish")');
    await expect(page.locator('text=/published|success/i')).toBeVisible();
    
    // Verify post appears in posts list
    await page.goto('/dashboard/posts');
    await expect(page.locator(`text="${postData.title}"`)).toBeVisible();
  });

  test('should edit an existing post', async ({ page }) => {
    // Navigate to posts list
    await page.goto('/dashboard/posts');
    
    // Click on first post to edit
    await page.click('tbody tr:first-child a:has-text("Edit")');
    
    // Update title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();
    const newTitle = faker.lorem.sentence();
    await titleInput.fill(newTitle);
    
    // Save changes
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|updated/i')).toBeVisible();
    
    // Verify changes in list
    await page.goto('/dashboard/posts');
    await expect(page.locator(`text="${newTitle}"`)).toBeVisible();
  });

  test('should delete a post', async ({ page }) => {
    // Navigate to posts list
    await page.goto('/dashboard/posts');
    
    // Get title of first post
    const firstPostTitle = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
    
    // Click delete button
    await page.click('tbody tr:first-child button:has-text("Delete")');
    
    // Confirm deletion in dialog
    await page.click('button:has-text("Confirm")');
    
    // Verify post is removed
    await expect(page.locator(`text="${firstPostTitle}"`)).not.toBeVisible();
    await expect(page.locator('text=/deleted|removed/i')).toBeVisible();
  });

  test('should save draft and auto-save', async ({ page }) => {
    const postTitle = faker.lorem.sentence();
    
    // Navigate to create post
    await page.goto('/dashboard/posts/new');
    
    // Fill title
    await page.fill('input[name="title"]', postTitle);
    
    // Wait for auto-save (usually triggered after a delay)
    await page.waitForTimeout(3000);
    
    // Check for auto-save indicator
    await expect(page.locator('text=/auto-saved|saving/i')).toBeVisible();
    
    // Navigate away and come back
    await page.goto('/dashboard');
    await page.goto('/dashboard/posts');
    
    // Verify draft is saved
    await expect(page.locator(`text="${postTitle}"`)).toBeVisible();
    await expect(page.locator('text="Draft"')).toBeVisible();
  });
});