import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Comment and Interaction System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a blog post
    await page.goto('/blog');
    // Click on the first post
    await page.click('article:first-child a');
    await page.waitForURL(/\/blog\/[^\/]+$/);
  });

  test('should add a comment to a post', async ({ page }) => {
    const commentText = faker.lorem.paragraph();
    
    // Login first (if not already logged in)
    const loginButton = page.locator('text="Login to comment"');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.fill('input[name="emailOrUsername"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/blog\/[^\/]+$/);
    }
    
    // Write comment
    await page.fill('textarea[placeholder*="comment"]', commentText);
    await page.click('button:has-text("Post Comment")');
    
    // Verify comment appears
    await expect(page.locator(`text="${commentText}"`)).toBeVisible();
  });

  test('should reply to a comment', async ({ page }) => {
    const replyText = faker.lorem.sentence();
    
    // Find first comment and click reply
    await page.click('button:has-text("Reply"):first');
    
    // Write reply
    await page.fill('textarea[placeholder*="reply"]', replyText);
    await page.click('button:has-text("Post Reply")');
    
    // Verify reply appears
    await expect(page.locator(`text="${replyText}"`)).toBeVisible();
  });

  test('should like and unlike a post', async ({ page }) => {
    // Get initial like count
    const likeButton = page.locator('[data-testid="like-button"]');
    const initialCount = await likeButton.locator('span').textContent();
    const initialLikes = parseInt(initialCount || '0');
    
    // Click like button
    await likeButton.click();
    
    // Verify like count increased
    await expect(likeButton.locator('span')).toHaveText((initialLikes + 1).toString());
    
    // Unlike
    await likeButton.click();
    
    // Verify like count decreased
    await expect(likeButton.locator('span')).toHaveText(initialLikes.toString());
  });

  test('should edit own comment', async ({ page }) => {
    // Assuming user has a comment (create one first if needed)
    const originalComment = faker.lorem.sentence();
    const editedComment = faker.lorem.sentence();
    
    // Post a comment first
    await page.fill('textarea[placeholder*="comment"]', originalComment);
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator(`text="${originalComment}"`)).toBeVisible();
    
    // Edit the comment
    await page.click('button[aria-label="Edit comment"]');
    await page.fill('textarea[value*="${originalComment}"]', editedComment);
    await page.click('button:has-text("Save")');
    
    // Verify edited comment
    await expect(page.locator(`text="${editedComment}"`)).toBeVisible();
    await expect(page.locator(`text="${originalComment}"`)).not.toBeVisible();
  });

  test('should delete own comment', async ({ page }) => {
    const commentToDelete = faker.lorem.sentence();
    
    // Post a comment
    await page.fill('textarea[placeholder*="comment"]', commentToDelete);
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator(`text="${commentToDelete}"`)).toBeVisible();
    
    // Delete the comment
    await page.click('button[aria-label="Delete comment"]');
    await page.click('button:has-text("Confirm")');
    
    // Verify comment is deleted
    await expect(page.locator(`text="${commentToDelete}"`)).not.toBeVisible();
    await expect(page.locator('text=/deleted|removed/i')).toBeVisible();
  });
});