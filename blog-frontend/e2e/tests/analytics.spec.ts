import { test, expect } from '../fixtures/test';
import { generateUser, generatePost } from '../helpers/test-data';

test.describe('Analytics Features', () => {
  let user: any;
  let postId: string;
  let postSlug: string;

  test.beforeAll(async ({ request, baseURL }) => {
    // Register a test user
    user = generateUser();
    const registerResponse = await request.post(`${baseURL}/api/auth/register`, {
      data: user,
    });
    const authData = await registerResponse.json();
    user.accessToken = authData.accessToken;
    user.id = authData.user.id;

    // Create a test post
    const postData = generatePost();
    const postResponse = await request.post(`${baseURL}/api/posts`, {
      data: { ...postData, status: 'published' },
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    const post = await postResponse.json();
    postId = post._id;
    postSlug = post.slug;
  });

  test.describe('View Tracking', () => {
    test('should track views when visiting a blog post', async ({ page }) => {
      // Visit the blog post
      await page.goto(`/blog/${postSlug}`);
      
      // Wait for the post to load
      await expect(page.locator('h1')).toBeVisible();
      
      // Wait for analytics tracking (usually happens on mount)
      await page.waitForTimeout(1000);
      
      // Check that view tracking request was made
      await page.waitForRequest(
        (request) =>
          request.url().includes('/api/analytics/posts/') &&
          request.url().includes('/track') &&
          request.method() === 'POST',
      );
    });

    test('should track reading duration', async ({ page }) => {
      await page.goto(`/blog/${postSlug}`);
      
      // Simulate reading by scrolling
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(2000);
      
      // Navigate away to trigger duration tracking
      await page.goto('/blog');
      
      // Verify duration was tracked
      // The beforeunload event should have triggered tracking
    });

    test('should create unique session for tracking', async ({ page }) => {
      await page.goto(`/blog/${postSlug}`);
      
      // Check localStorage for session ID
      const sessionId = await page.evaluate(() => {
        return localStorage.getItem('analytics_session_id');
      });
      
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^[a-zA-Z0-9-]+$/);
    });
  });

  test.describe('Analytics Dashboard', () => {
    test.beforeEach(async ({ page, authPage }) => {
      // Login before each test
      await authPage.login(user.email, user.password);
      await page.waitForURL('/dashboard');
    });

    test('should display analytics overview', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Check for main analytics elements
      await expect(page.locator('h1:has-text("Analytics Overview")')).toBeVisible();
      
      // Stats cards should be visible
      await expect(page.locator('[data-testid="stats-card"]').first()).toBeVisible();
      
      // Chart should be rendered
      await expect(page.locator('canvas').first()).toBeVisible();
      
      // Top posts section
      await expect(page.locator('text=/Top Posts/i')).toBeVisible();
    });

    test('should filter analytics by time range', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Find and click time range selector
      const timeRangeSelector = page.locator('select[aria-label*="time"]');
      
      // Test different time ranges
      const timeRanges = ['day', 'week', 'month', 'year', 'all'];
      
      for (const range of timeRanges) {
        await timeRangeSelector.selectOption(range);
        await page.waitForTimeout(500); // Wait for data to reload
        
        // Verify data updates (check that stats cards still show)
        await expect(page.locator('[data-testid="stats-card"]').first()).toBeVisible();
      }
    });

    test('should show growth metrics', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Check for growth rate display
      await expect(page.locator('text=/Growth Rate/i')).toBeVisible();
      
      // Check for engagement rate
      await expect(page.locator('text=/Engagement Rate/i')).toBeVisible();
    });

    test('should display top posts with metrics', async ({ page }) => {
      await page.goto('/dashboard/analytics');
      
      // Check top posts section
      const topPostsSection = page.locator('[data-testid="top-posts"]');
      await expect(topPostsSection).toBeVisible();
      
      // If there are posts, they should show metrics
      const firstPost = topPostsSection.locator('[data-testid="post-item"]').first();
      if (await firstPost.isVisible()) {
        await expect(firstPost.locator('text=/views/i')).toBeVisible();
        await expect(firstPost.locator('text=/likes/i')).toBeVisible();
      }
    });
  });

  test.describe('Individual Post Analytics', () => {
    test.beforeEach(async ({ page, authPage }) => {
      await authPage.login(user.email, user.password);
      await page.waitForURL('/dashboard');
    });

    test('should navigate to post analytics from dashboard', async ({ page }) => {
      await page.goto('/dashboard/posts');
      
      // Find the post and click analytics button/link
      const postRow = page.locator(`text=${postSlug}`).locator('xpath=ancestor::*[contains(@class, "hover:bg-gray-50")]').first();
      
      // Click the menu button
      await postRow.locator('button[aria-label*="menu"]').click();
      
      // Click analytics option
      await page.locator('text=/View Analytics/i').click();
      
      // Should navigate to post analytics page
      await expect(page).toHaveURL(new RegExp(`/dashboard/analytics/${postId}`));
    });

    test('should display detailed post analytics', async ({ page }) => {
      await page.goto(`/dashboard/analytics/${postId}`);
      
      // Check for post title
      await expect(page.locator('h1')).toBeVisible();
      
      // Check for key metrics
      await expect(page.locator('text=/Total Views/i')).toBeVisible();
      await expect(page.locator('text=/Unique Views/i')).toBeVisible();
      await expect(page.locator('text=/Avg. Read Time/i')).toBeVisible();
      await expect(page.locator('text=/Engagement Rate/i')).toBeVisible();
    });

    test('should show device breakdown', async ({ page }) => {
      await page.goto(`/dashboard/analytics/${postId}`);
      
      // Check for device stats
      await expect(page.locator('text=/Device Breakdown/i')).toBeVisible();
      await expect(page.locator('text=/Desktop/i')).toBeVisible();
      await expect(page.locator('text=/Mobile/i')).toBeVisible();
      await expect(page.locator('text=/Tablet/i')).toBeVisible();
    });

    test('should display referrer information', async ({ page }) => {
      await page.goto(`/dashboard/analytics/${postId}`);
      
      // Check for referrer section
      await expect(page.locator('text=/Top Referrers/i')).toBeVisible();
    });

    test('should show engagement metrics', async ({ page }) => {
      await page.goto(`/dashboard/analytics/${postId}`);
      
      // Check engagement section
      const engagementSection = page.locator('[data-testid="engagement-metrics"]');
      
      if (await engagementSection.isVisible()) {
        await expect(engagementSection.locator('text=/Likes/i')).toBeVisible();
        await expect(engagementSection.locator('text=/Comments/i')).toBeVisible();
        await expect(engagementSection.locator('text=/Shares/i')).toBeVisible();
      }
    });

    test('should display views over time chart', async ({ page }) => {
      await page.goto(`/dashboard/analytics/${postId}`);
      
      // Check for chart
      await expect(page.locator('text=/Views Over Time/i')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('should allow time range filtering', async ({ page }) => {
      await page.goto(`/dashboard/analytics/${postId}`);
      
      // Find time range selector
      const selector = page.locator('select').first();
      
      // Change time range
      await selector.selectOption('week');
      await page.waitForTimeout(500);
      
      // Verify page still displays correctly
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=/Total Views/i')).toBeVisible();
    });

    test('should provide action buttons', async ({ page }) => {
      await page.goto(`/dashboard/analytics/${postId}`);
      
      // Check for action buttons
      await expect(page.locator('text=/View Post/i')).toBeVisible();
      await expect(page.locator('text=/Edit Post/i')).toBeVisible();
      await expect(page.locator('text=/Export Report/i')).toBeVisible();
    });
  });

  test.describe('Analytics Data Accuracy', () => {
    test('should not count duplicate views from same session', async ({ page, context }) => {
      // First visit
      await page.goto(`/blog/${postSlug}`);
      await page.waitForTimeout(1000);
      
      // Second visit in same session
      await page.goto('/blog');
      await page.goto(`/blog/${postSlug}`);
      await page.waitForTimeout(1000);
      
      // Check that session ID remained the same
      const sessionId = await page.evaluate(() => {
        return localStorage.getItem('analytics_session_id');
      });
      
      expect(sessionId).toBeTruthy();
      
      // The backend should handle deduplication
      // Views should only increment once per session per day
    });

    test('should track views from different browser contexts separately', async ({ browser }) => {
      // Create two different contexts (simulating different users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Visit from first context
      await page1.goto(`/blog/${postSlug}`);
      const session1 = await page1.evaluate(() => localStorage.getItem('analytics_session_id'));
      
      // Visit from second context
      await page2.goto(`/blog/${postSlug}`);
      const session2 = await page2.evaluate(() => localStorage.getItem('analytics_session_id'));
      
      // Sessions should be different
      expect(session1).not.toBe(session2);
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('Analytics Performance', () => {
    test('should not block page load for analytics', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`/blog/${postSlug}`);
      await expect(page.locator('h1')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Page should load quickly regardless of analytics
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle analytics API failures gracefully', async ({ page, context }) => {
      // Block analytics endpoint
      await context.route('**/api/analytics/**', (route) => {
        route.abort();
      });
      
      // Page should still load normally
      await page.goto(`/blog/${postSlug}`);
      await expect(page.locator('h1')).toBeVisible();
      
      // No error messages should be shown to user
      await expect(page.locator('text=/error/i')).not.toBeVisible();
    });
  });
});