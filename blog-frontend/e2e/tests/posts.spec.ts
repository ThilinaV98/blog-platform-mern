import { test, expect } from '../fixtures/test';
import { generatePost, testUsers, loginUser, samplePosts } from '../helpers/test-data';
import path from 'path';

test.describe('Post Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as author before each test
    await loginUser(page, testUsers.author);
  });

  test.describe('Create Post', () => {
    test('should create a new post successfully', async ({ page, postPage, dashboardPage }) => {
      const post = generatePost();
      
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      await postPage.fillPostForm(post);
      await postPage.saveDraft();
      
      await postPage.expectSuccessMessage(/draft saved/i);
      
      // Verify post appears in drafts
      await dashboardPage.navigateToPosts();
      await dashboardPage.expectPostInList(post.title);
    });

    test('should validate required fields', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      // Try to save without title
      await postPage.contentEditor.fill('Some content');
      await postPage.saveButton.click();
      
      await postPage.expectErrorMessage(/title is required/i);
      
      // Try to save without content
      await postPage.titleInput.fill('Test Title');
      await postPage.contentEditor.clear();
      await postPage.saveButton.click();
      
      await postPage.expectErrorMessage(/content is required/i);
    });

    test('should handle rich text formatting', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      await postPage.titleInput.fill('Formatted Post');
      
      // Type and format text
      await postPage.contentEditor.fill('This is bold text');
      await postPage.contentEditor.selectText();
      await postPage.formatText('bold');
      
      await postPage.contentEditor.press('End');
      await postPage.contentEditor.type(' and this is italic');
      await postPage.contentEditor.selectText(/italic/);
      await postPage.formatText('italic');
      
      await postPage.saveDraft();
      await postPage.expectSuccessMessage(/draft saved/i);
      
      // Verify formatting is preserved
      const content = await postPage.contentEditor.innerHTML();
      expect(content).toContain('<strong>');
      expect(content).toContain('<em>');
    });

    test('should insert links and images', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      await postPage.titleInput.fill('Post with Media');
      await postPage.contentEditor.fill('Check out this ');
      
      // Insert link
      await postPage.insertLink('https://example.com', 'link');
      
      await postPage.contentEditor.press('End');
      await postPage.contentEditor.type(' and this image:');
      
      // Insert image
      await postPage.imageButton.click();
      await page.getByPlaceholder(/image url/i).fill('https://via.placeholder.com/150');
      await page.getByRole('button', { name: /insert/i }).click();
      
      await postPage.saveDraft();
      await postPage.expectSuccessMessage(/draft saved/i);
      
      // Verify link and image are inserted
      const content = await postPage.contentEditor.innerHTML();
      expect(content).toContain('href="https://example.com"');
      expect(content).toContain('src="https://via.placeholder.com/150"');
    });

    test('should upload and set cover image', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = generatePost();
      await postPage.fillPostForm(post);
      
      // Upload cover image
      const imagePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');
      await postPage.uploadCoverImage(imagePath);
      
      // Wait for upload
      await page.waitForSelector('[data-testid="cover-image-preview"]');
      
      await postPage.saveDraft();
      await postPage.expectSuccessMessage(/draft saved/i);
    });

    test('should auto-save draft periodically', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      await postPage.titleInput.fill('Auto-save Test');
      await postPage.contentEditor.fill('Initial content');
      
      // Wait for auto-save (usually after 30 seconds of inactivity)
      await page.waitForTimeout(3000); // Simulate shorter auto-save for testing
      
      // Make a change
      await postPage.contentEditor.fill('Updated content');
      
      // Should see auto-save indicator
      await expect(page.locator('[data-testid="auto-saving"]')).toBeVisible();
      await expect(page.locator('[data-testid="auto-saved"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Edit Post', () => {
    let postId: string;

    test.beforeEach(async ({ page, postPage, dashboardPage }) => {
      // Create a post to edit
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = samplePosts[0];
      await postPage.fillPostForm(post);
      await postPage.saveDraft();
      
      // Get post ID from URL
      await page.waitForURL(/\/dashboard\/posts\/.+\/edit/);
      postId = page.url().match(/posts\/(.+)\/edit/)?.[1] || '';
    });

    test('should edit existing post', async ({ page, postPage }) => {
      await postPage.gotoEdit(postId);
      
      // Update title and content
      await postPage.titleInput.clear();
      await postPage.titleInput.fill('Updated Title');
      
      await postPage.contentEditor.clear();
      await postPage.contentEditor.fill('Updated content');
      
      await postPage.saveDraft();
      await postPage.expectSuccessMessage(/changes saved/i);
      
      // Verify changes persist
      await page.reload();
      await postPage.expectTitle('Updated Title');
      await postPage.expectContent('Updated content');
    });

    test('should update post metadata', async ({ page, postPage }) => {
      await postPage.gotoEdit(postId);
      
      // Update category and tags
      await postPage.categorySelect.selectOption('Design');
      
      // Clear existing tags
      const tagElements = await page.locator('[data-testid="tag-chip"]').all();
      for (const tag of tagElements) {
        await tag.locator('button').click(); // Remove tag
      }
      
      // Add new tags
      await postPage.tagsInput.fill('design');
      await page.keyboard.press('Enter');
      await postPage.tagsInput.fill('ui');
      await page.keyboard.press('Enter');
      
      await postPage.saveDraft();
      await postPage.expectSuccessMessage(/changes saved/i);
    });

    test('should preserve draft changes when navigating away', async ({ page, postPage, dashboardPage }) => {
      await postPage.gotoEdit(postId);
      
      // Make changes
      await postPage.titleInput.clear();
      await postPage.titleInput.fill('Unsaved Changes');
      
      // Try to navigate away
      await dashboardPage.postsTab.click();
      
      // Should show confirmation dialog
      await expect(page.getByText(/unsaved changes/i)).toBeVisible();
      
      // Cancel navigation
      await page.getByRole('button', { name: /cancel/i }).click();
      
      // Should still be on edit page
      await expect(page).toHaveURL(new RegExp(`/posts/${postId}/edit`));
      
      // Save changes
      await postPage.saveDraft();
      
      // Now navigation should work without warning
      await dashboardPage.postsTab.click();
      await expect(page).toHaveURL('/dashboard/posts');
    });
  });

  test.describe('Publish Post', () => {
    test('should publish a draft post', async ({ page, postPage, dashboardPage }) => {
      // Create a draft
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = samplePosts[1];
      await postPage.fillPostForm(post);
      await postPage.saveDraft();
      
      // Publish the post
      await postPage.publish();
      
      // Should redirect to posts list
      await expect(page).toHaveURL('/dashboard/posts');
      
      // Post should be marked as published
      const postCard = page.locator('article').filter({ hasText: post.title });
      await expect(postCard.locator('[data-testid="status-badge"]')).toHaveText(/published/i);
    });

    test('should schedule post for future publication', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = generatePost();
      await postPage.fillPostForm(post);
      
      // Open publish settings
      await page.getByRole('button', { name: /publish settings/i }).click();
      
      // Select schedule option
      await page.getByLabel(/schedule for later/i).check();
      
      // Set future date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await page.getByLabel(/publish date/i).fill(tomorrow.toISOString().split('T')[0]);
      await page.getByLabel(/publish time/i).fill('10:00');
      
      await page.getByRole('button', { name: /schedule/i }).click();
      
      await postPage.expectSuccessMessage(/scheduled for publication/i);
      
      // Verify post shows as scheduled
      await dashboardPage.navigateToPosts();
      const postCard = page.locator('article').filter({ hasText: post.title });
      await expect(postCard.locator('[data-testid="status-badge"]')).toHaveText(/scheduled/i);
    });

    test('should unpublish a published post', async ({ page, postPage, dashboardPage }) => {
      // Create and publish a post
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = generatePost();
      await postPage.fillPostForm(post);
      await postPage.saveDraft();
      await postPage.publish();
      
      // Go back to edit the post
      await dashboardPage.editPost(post.title);
      
      // Unpublish
      await page.getByRole('button', { name: /unpublish/i }).click();
      await page.getByRole('button', { name: /confirm unpublish/i }).click();
      
      await postPage.expectSuccessMessage(/post unpublished/i);
      
      // Verify status changed to draft
      await dashboardPage.navigateToPosts();
      const postCard = page.locator('article').filter({ hasText: post.title });
      await expect(postCard.locator('[data-testid="status-badge"]')).toHaveText(/draft/i);
    });
  });

  test.describe('Delete Post', () => {
    test('should delete a post', async ({ page, postPage, dashboardPage }) => {
      // Create a post
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = generatePost();
      await postPage.fillPostForm(post);
      await postPage.saveDraft();
      
      // Delete the post
      await postPage.deletePost();
      
      // Should redirect to posts list
      await expect(page).toHaveURL('/dashboard/posts');
      
      // Post should not be in the list
      await dashboardPage.expectPostNotInList(post.title);
    });

    test('should delete multiple posts', async ({ page, dashboardPage }) => {
      // Create multiple posts
      const posts = [];
      for (let i = 0; i < 3; i++) {
        await dashboardPage.goto();
        await dashboardPage.navigateToNewPost();
        
        const post = generatePost();
        await page.getByLabel(/title/i).fill(post.title);
        await page.locator('[data-testid="content-editor"]').fill(post.content);
        await page.getByRole('button', { name: /save draft/i }).click();
        
        posts.push(post);
        
        await dashboardPage.navigateToPosts();
      }
      
      // Select posts for bulk delete
      for (const post of posts) {
        const postCard = page.locator('article').filter({ hasText: post.title });
        await postCard.locator('input[type="checkbox"]').check();
      }
      
      // Bulk delete
      await page.getByRole('button', { name: /delete selected/i }).click();
      await page.getByRole('button', { name: /confirm delete/i }).click();
      
      // All posts should be deleted
      for (const post of posts) {
        await dashboardPage.expectPostNotInList(post.title);
      }
    });
  });

  test.describe('Post Search and Filter', () => {
    test.beforeEach(async ({ page, dashboardPage }) => {
      // Create posts with different statuses and categories
      const posts = [
        { ...generatePost(), category: 'Technology', status: 'published' },
        { ...generatePost(), category: 'Design', status: 'draft' },
        { ...generatePost(), category: 'Business', status: 'published' },
      ];
      
      for (const post of posts) {
        await dashboardPage.goto();
        await dashboardPage.navigateToNewPost();
        
        await page.getByLabel(/title/i).fill(post.title);
        await page.locator('[data-testid="content-editor"]').fill(post.content);
        await page.getByLabel(/category/i).selectOption(post.category);
        
        if (post.status === 'published') {
          await page.getByRole('button', { name: /publish/i }).click();
          await page.getByRole('button', { name: /confirm publish/i }).click();
        } else {
          await page.getByRole('button', { name: /save draft/i }).click();
        }
        
        await dashboardPage.navigateToPosts();
      }
    });

    test('should search posts by title', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToPosts();
      
      // Get first post title
      const firstPostTitle = await page.locator('article h3').first().textContent();
      
      // Search for it
      await dashboardPage.searchPosts(firstPostTitle || '');
      
      // Should show only matching post
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.locator('article h3')).toHaveText(firstPostTitle || '');
    });

    test('should filter posts by status', async ({ page }) => {
      await page.goto('/dashboard/posts');
      
      // Filter by draft
      await page.getByLabel(/status/i).selectOption('draft');
      
      // Should only show drafts
      const statusBadges = await page.locator('[data-testid="status-badge"]').allTextContents();
      expect(statusBadges.every(badge => badge.toLowerCase().includes('draft'))).toBe(true);
      
      // Filter by published
      await page.getByLabel(/status/i).selectOption('published');
      
      // Should only show published posts
      const publishedBadges = await page.locator('[data-testid="status-badge"]').allTextContents();
      expect(publishedBadges.every(badge => badge.toLowerCase().includes('published'))).toBe(true);
    });

    test('should filter posts by category', async ({ page }) => {
      await page.goto('/dashboard/posts');
      
      // Filter by Technology category
      await page.getByLabel(/category/i).selectOption('Technology');
      
      // Should only show Technology posts
      const categories = await page.locator('[data-testid="post-category"]').allTextContents();
      expect(categories.every(cat => cat === 'Technology')).toBe(true);
    });

    test('should sort posts', async ({ page }) => {
      await page.goto('/dashboard/posts');
      
      // Sort by newest
      await page.getByLabel(/sort by/i).selectOption('newest');
      
      // Get dates
      const dates = await page.locator('[data-testid="post-date"]').allTextContents();
      const timestamps = dates.map(d => new Date(d).getTime());
      
      // Should be in descending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
      
      // Sort by oldest
      await page.getByLabel(/sort by/i).selectOption('oldest');
      
      // Get dates again
      const oldestDates = await page.locator('[data-testid="post-date"]').allTextContents();
      const oldestTimestamps = oldestDates.map(d => new Date(d).getTime());
      
      // Should be in ascending order
      for (let i = 1; i < oldestTimestamps.length; i++) {
        expect(oldestTimestamps[i - 1]).toBeLessThanOrEqual(oldestTimestamps[i]);
      }
    });
  });

  test.describe('Post Preview', () => {
    test('should preview post before publishing', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = samplePosts[0];
      await postPage.fillPostForm(post);
      await postPage.saveDraft();
      
      // Open preview
      await page.getByRole('button', { name: /preview/i }).click();
      
      // Should open preview in new tab
      const [previewPage] = await Promise.all([
        page.context().waitForEvent('page'),
        page.getByRole('link', { name: /open preview/i }).click(),
      ]);
      
      // Verify preview content
      await expect(previewPage).toHaveURL(/\/preview\//);
      await expect(previewPage.getByRole('heading', { level: 1 })).toHaveText(post.title);
      await expect(previewPage.locator('article')).toContainText(post.excerpt);
      
      await previewPage.close();
    });

    test('should show mobile preview', async ({ page, postPage, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateToNewPost();
      
      const post = generatePost();
      await postPage.fillPostForm(post);
      await postPage.saveDraft();
      
      // Open mobile preview
      await page.getByRole('button', { name: /preview/i }).click();
      await page.getByRole('button', { name: /mobile view/i }).click();
      
      // Preview should be in mobile viewport
      const previewFrame = page.frameLocator('[data-testid="preview-frame"]');
      const viewportSize = await previewFrame.locator('body').boundingBox();
      
      expect(viewportSize?.width).toBeLessThanOrEqual(414); // iPhone width
    });
  });
});