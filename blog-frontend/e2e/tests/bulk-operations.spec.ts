import { test, expect } from '../fixtures/test';
import { generateUser, generatePost } from '../helpers/test-data';

test.describe('Bulk Operations for Posts', () => {
  let user: any;
  let postIds: string[] = [];
  let postTitles: string[] = [];

  test.beforeAll(async ({ request, baseURL }) => {
    // Register a test user
    user = generateUser();
    const registerResponse = await request.post(`${baseURL}/api/auth/register`, {
      data: user,
    });
    const authData = await registerResponse.json();
    user.accessToken = authData.accessToken;
    user.id = authData.user.id;

    // Create multiple test posts with different statuses
    const statuses = ['draft', 'draft', 'published', 'published', 'archived'];
    
    for (let i = 0; i < 5; i++) {
      const postData = generatePost({ 
        title: `Bulk Test Post ${i + 1}`,
        status: statuses[i] 
      });
      
      const postResponse = await request.post(`${baseURL}/api/posts`, {
        data: postData,
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });
      
      const post = await postResponse.json();
      postIds.push(post._id);
      postTitles.push(post.title);
    }
  });

  test.describe('Selection Operations', () => {
    test.beforeEach(async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.waitForURL('/dashboard');
      await page.goto('/dashboard/posts');
    });

    test('should select individual posts', async ({ page }) => {
      // Wait for posts to load
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select first post
      const firstCheckbox = page.locator('input[type="checkbox"]').nth(1); // nth(0) is select all
      await firstCheckbox.click();
      
      // Verify checkbox is checked
      await expect(firstCheckbox).toBeChecked();
      
      // Verify bulk actions bar appears
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();
      await expect(page.locator('text=/1 post selected/i')).toBeVisible();
    });

    test('should select multiple posts', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select multiple posts
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click(); // First post
      await checkboxes.nth(2).click(); // Second post
      await checkboxes.nth(3).click(); // Third post
      
      // Verify bulk actions bar shows correct count
      await expect(page.locator('text=/3 posts selected/i')).toBeVisible();
    });

    test('should use select all checkbox', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Click select all checkbox
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      await selectAllCheckbox.click();
      
      // Verify all checkboxes are checked
      const allCheckboxes = page.locator('input[type="checkbox"]');
      const count = await allCheckboxes.count();
      
      for (let i = 0; i < count; i++) {
        await expect(allCheckboxes.nth(i)).toBeChecked();
      }
      
      // Verify bulk actions bar shows correct count
      const postCount = count - 1; // Minus the select all checkbox
      await expect(page.locator(`text=/${postCount} posts? selected/i`)).toBeVisible();
    });

    test('should deselect all when clicking select all again', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      
      // Select all
      await selectAllCheckbox.click();
      await expect(selectAllCheckbox).toBeChecked();
      
      // Deselect all
      await selectAllCheckbox.click();
      await expect(selectAllCheckbox).not.toBeChecked();
      
      // Verify all checkboxes are unchecked
      const allCheckboxes = page.locator('input[type="checkbox"]');
      const count = await allCheckboxes.count();
      
      for (let i = 0; i < count; i++) {
        await expect(allCheckboxes.nth(i)).not.toBeChecked();
      }
      
      // Bulk actions bar should disappear
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible();
    });

    test('should update select all state when individual items change', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      const checkboxes = page.locator('input[type="checkbox"]');
      const totalCount = await checkboxes.count();
      
      // Select all except one
      for (let i = 1; i < totalCount - 1; i++) {
        await checkboxes.nth(i).click();
      }
      
      // Select all should be unchecked (not all items selected)
      await expect(selectAllCheckbox).not.toBeChecked();
      
      // Select the last one
      await checkboxes.nth(totalCount - 1).click();
      
      // Now select all should be checked
      await expect(selectAllCheckbox).toBeChecked();
    });
  });

  test.describe('Bulk Publish Operations', () => {
    test.beforeEach(async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.goto('/dashboard/posts?status=draft');
    });

    test('should bulk publish draft posts', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select draft posts
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      await checkboxes.nth(2).click();
      
      // Click bulk publish button
      await page.locator('button:has-text("Publish Selected")').click();
      
      // Confirm action if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Wait for success message
      await expect(page.locator('text=/published successfully/i')).toBeVisible();
      
      // Verify posts status changed
      await page.reload();
      await page.goto('/dashboard/posts?status=published');
      
      // Should see the published posts
      await expect(page.locator('[data-testid="post-item"]')).toHaveCount(4); // 2 original + 2 newly published
    });
  });

  test.describe('Bulk Archive Operations', () => {
    test.beforeEach(async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.goto('/dashboard/posts?status=published');
    });

    test('should bulk archive published posts', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select published posts
      const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
      await selectAllCheckbox.click();
      
      // Click bulk archive button
      await page.locator('button:has-text("Archive Selected")').click();
      
      // Confirm if needed
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Wait for success message
      await expect(page.locator('text=/archived successfully/i')).toBeVisible();
      
      // Verify posts moved to archived
      await page.reload();
      await page.goto('/dashboard/posts?status=archived');
      
      // Should see archived posts
      await expect(page.locator('[data-testid="post-item"]').first()).toBeVisible();
    });
  });

  test.describe('Bulk Delete Operations', () => {
    test.beforeEach(async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.goto('/dashboard/posts');
    });

    test('should show confirmation dialog for bulk delete', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select posts
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      await checkboxes.nth(2).click();
      
      // Click bulk delete button
      await page.locator('button:has-text("Delete Selected")').click();
      
      // Confirmation dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=/Are you sure.*delete.*posts/i')).toBeVisible();
      await expect(page.locator('text=/This action cannot be undone/i')).toBeVisible();
    });

    test('should cancel bulk delete operation', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      const initialCount = await page.locator('[data-testid="post-item"]').count();
      
      // Select posts
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      
      // Click delete and then cancel
      await page.locator('button:has-text("Delete Selected")').click();
      await page.locator('button:has-text("Cancel")').click();
      
      // Dialog should close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Posts should still exist
      const finalCount = await page.locator('[data-testid="post-item"]').count();
      expect(finalCount).toBe(initialCount);
    });

    test('should bulk delete posts after confirmation', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      const initialCount = await page.locator('[data-testid="post-item"]').count();
      
      // Select posts to delete
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      await checkboxes.nth(2).click();
      
      // Click delete and confirm
      await page.locator('button:has-text("Delete Selected")').click();
      await page.locator('[role="dialog"] button:has-text("Delete")').click();
      
      // Wait for success message
      await expect(page.locator('text=/deleted successfully/i')).toBeVisible();
      
      // Verify posts are removed
      await page.reload();
      const finalCount = await page.locator('[data-testid="post-item"]').count();
      expect(finalCount).toBe(initialCount - 2);
    });
  });

  test.describe('Bulk Actions UI Behavior', () => {
    test.beforeEach(async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.goto('/dashboard/posts');
    });

    test('should show appropriate bulk actions based on selection', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select posts
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      
      // Verify all bulk action buttons are visible
      await expect(page.locator('button:has-text("Publish Selected")')).toBeVisible();
      await expect(page.locator('button:has-text("Archive Selected")')).toBeVisible();
      await expect(page.locator('button:has-text("Delete Selected")')).toBeVisible();
    });

    test('should disable bulk actions when no posts selected', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Initially no posts selected
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible();
      
      // Select and deselect
      const checkbox = page.locator('input[type="checkbox"]').nth(1);
      await checkbox.click();
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();
      
      await checkbox.click();
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible();
    });

    test('should update selection count dynamically', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      const checkboxes = page.locator('input[type="checkbox"]');
      
      // Select first post
      await checkboxes.nth(1).click();
      await expect(page.locator('text=/1 post selected/i')).toBeVisible();
      
      // Select second post
      await checkboxes.nth(2).click();
      await expect(page.locator('text=/2 posts selected/i')).toBeVisible();
      
      // Select third post
      await checkboxes.nth(3).click();
      await expect(page.locator('text=/3 posts selected/i')).toBeVisible();
      
      // Deselect one
      await checkboxes.nth(2).click();
      await expect(page.locator('text=/2 posts selected/i')).toBeVisible();
    });

    test('should clear selection after bulk action', async ({ page }) => {
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select posts
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      await checkboxes.nth(2).click();
      
      // Perform bulk action (archive)
      await page.locator('button:has-text("Archive Selected")').click();
      
      // Confirm if needed
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Wait for action to complete
      await page.waitForTimeout(1000);
      
      // Selection should be cleared
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible();
      
      // All checkboxes should be unchecked
      const allCheckboxes = page.locator('input[type="checkbox"]');
      const count = await allCheckboxes.count();
      
      for (let i = 0; i < count; i++) {
        await expect(allCheckboxes.nth(i)).not.toBeChecked();
      }
    });
  });

  test.describe('Bulk Operations with Filters', () => {
    test('should maintain selection when switching between filters', async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.goto('/dashboard/posts');
      
      // Select posts in "All" view
      await page.waitForSelector('[data-testid="post-item"]');
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      await checkboxes.nth(2).click();
      
      // Switch to draft filter
      await page.locator('button:has-text("Drafts")').click();
      
      // Selection should be cleared (different context)
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).not.toBeVisible();
    });

    test('should work correctly with status filters', async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      
      // Test bulk operations in draft view
      await page.goto('/dashboard/posts?status=draft');
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select all drafts
      const selectAll = page.locator('input[type="checkbox"]').first();
      await selectAll.click();
      
      // Should only show draft posts selected
      const selectedCount = await page.locator('input[type="checkbox"]:checked').count();
      expect(selectedCount).toBeGreaterThan(0);
      
      // Publish action should be available for drafts
      await expect(page.locator('button:has-text("Publish Selected")')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle bulk operation failures gracefully', async ({ page, authPage, context }) => {
      await authPage.login(user.email, user.password);
      await page.goto('/dashboard/posts');
      
      // Intercept and fail bulk operation request
      await context.route('**/api/posts/*/publish', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ message: 'Server error' }),
        });
      });
      
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select and try to publish
      const checkbox = page.locator('input[type="checkbox"]').nth(1);
      await checkbox.click();
      await page.locator('button:has-text("Publish Selected")').click();
      
      // Should show error message
      await expect(page.locator('text=/Failed to.*publish/i')).toBeVisible();
      
      // Selection should remain
      await expect(checkbox).toBeChecked();
    });

    test('should handle partial failures in bulk operations', async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.goto('/dashboard/posts');
      
      await page.waitForSelector('[data-testid="post-item"]');
      
      // Select multiple posts
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(1).click();
      await checkboxes.nth(2).click();
      await checkboxes.nth(3).click();
      
      // Perform bulk operation
      await page.locator('button:has-text("Archive Selected")').click();
      
      // Even if some fail, should show appropriate message
      // This would need backend to handle partial failures appropriately
    });
  });
});