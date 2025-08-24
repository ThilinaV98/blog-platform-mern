import { test, expect } from '../fixtures/test';
import { samplePosts } from '../helpers/test-data';

test.describe('Blog Reading Experience', () => {
  test.describe('Browse Posts', () => {
    test('should display blog posts list', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Should show posts
      await expect(blogPage.postCards).toHaveCount(10); // Default pagination
      
      // Each post should have required elements
      const firstPost = blogPage.postCards.first();
      await expect(firstPost.locator('h2')).toBeVisible(); // Title
      await expect(firstPost.locator('[data-testid="post-excerpt"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-author"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-date"]')).toBeVisible();
    });

    test('should load more posts on scroll', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Initial posts
      await expect(blogPage.postCards).toHaveCount(10);
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Click load more button
      await blogPage.loadMoreButton.click();
      
      // Should load more posts
      await expect(blogPage.postCards).toHaveCount(20);
    });

    test('should implement infinite scroll', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Enable infinite scroll
      await page.getByLabel(/infinite scroll/i).check();
      
      // Initial posts
      await expect(blogPage.postCards).toHaveCount(10);
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Wait for auto-load
      await page.waitForTimeout(1000);
      
      // Should automatically load more posts
      await expect(blogPage.postCards).toHaveCount(20);
    });

    test('should show featured posts section', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Should have featured section
      const featuredSection = page.locator('[data-testid="featured-posts"]');
      await expect(featuredSection).toBeVisible();
      
      // Featured posts should have special styling
      const featuredPosts = featuredSection.locator('article');
      await expect(featuredPosts).toHaveCount(3);
      
      // Check for featured badge
      await expect(featuredPosts.first().locator('[data-testid="featured-badge"]')).toBeVisible();
    });

    test('should show trending posts sidebar', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Should have trending sidebar
      const trendingSection = page.locator('[data-testid="trending-posts"]');
      await expect(trendingSection).toBeVisible();
      
      // Should show top 5 trending posts
      const trendingPosts = trendingSection.locator('a');
      await expect(trendingPosts).toHaveCount(5);
    });
  });

  test.describe('Search and Filter', () => {
    test('should search posts by keyword', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Search for a specific keyword
      await blogPage.searchPosts('Next.js');
      
      // Should show search results
      await expect(page.getByText(/search results for "Next.js"/i)).toBeVisible();
      
      // All results should contain the keyword
      const titles = await blogPage.postCards.locator('h2').allTextContents();
      expect(titles.some(title => title.toLowerCase().includes('next.js'))).toBe(true);
    });

    test('should filter posts by category', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Filter by Technology category
      await blogPage.filterByCategory('Technology');
      
      // URL should update
      await expect(page).toHaveURL(/category=Technology/);
      
      // All posts should be in Technology category
      const categories = await blogPage.postCards.locator('[data-testid="post-category"]').allTextContents();
      expect(categories.every(cat => cat === 'Technology')).toBe(true);
    });

    test('should filter posts by tag', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Click on a tag
      await page.locator('[data-testid="tag-cloud"]').getByText('react').click();
      
      // URL should update
      await expect(page).toHaveURL(/tag=react/);
      
      // All posts should have the tag
      const posts = await blogPage.postCards.all();
      for (const post of posts) {
        const tags = await post.locator('[data-testid="post-tags"]').textContent();
        expect(tags?.toLowerCase()).toContain('react');
      }
    });

    test('should combine multiple filters', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Apply category filter
      await blogPage.filterByCategory('Technology');
      
      // Apply sort
      await blogPage.sortBy('popular');
      
      // Search
      await blogPage.searchPosts('API');
      
      // URL should have all parameters
      await expect(page).toHaveURL(/category=Technology/);
      await expect(page).toHaveURL(/sort=popular/);
      await expect(page).toHaveURL(/q=API/);
      
      // Results should match all criteria
      const posts = await blogPage.postCards.all();
      expect(posts.length).toBeGreaterThan(0);
    });

    test('should clear filters', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Apply filters
      await blogPage.filterByCategory('Technology');
      await blogPage.searchPosts('test');
      
      // Clear filters
      await page.getByRole('button', { name: /clear filters/i }).click();
      
      // URL should be clean
      await expect(page).toHaveURL('/blog');
      
      // Should show all posts again
      await expect(blogPage.postCards).toHaveCount(10);
    });
  });

  test.describe('Sort Posts', () => {
    test('should sort by latest', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      await blogPage.sortBy('latest');
      
      // Get post dates
      const dates = await blogPage.postCards.locator('[data-testid="post-date"]').allTextContents();
      const timestamps = dates.map(d => new Date(d).getTime());
      
      // Should be in descending order (newest first)
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });

    test('should sort by popular', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      await blogPage.sortBy('popular');
      
      // Get view counts
      const views = await blogPage.postCards.locator('[data-testid="post-views"]').allTextContents();
      const viewCounts = views.map(v => parseInt(v.replace(/[^0-9]/g, '')));
      
      // Should be in descending order (most views first)
      for (let i = 1; i < viewCounts.length; i++) {
        expect(viewCounts[i - 1]).toBeGreaterThanOrEqual(viewCounts[i]);
      }
    });

    test('should sort by trending', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      await blogPage.sortBy('trending');
      
      // Trending posts should have trending badge
      const firstPost = blogPage.postCards.first();
      await expect(firstPost.locator('[data-testid="trending-badge"]')).toBeVisible();
    });
  });

  test.describe('Read Post', () => {
    test('should open and read full post', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Get first post title
      const postTitle = await blogPage.postCards.first().locator('h2').textContent();
      
      // Open the post
      await blogPage.openPost(postTitle || '');
      
      // Should navigate to post page
      await expect(page).toHaveURL(/\/blog\/.+/);
      
      // Should show full post content
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(postTitle || '');
      await expect(page.locator('article')).toBeVisible();
      
      // Should show author info
      await expect(page.locator('[data-testid="author-bio"]')).toBeVisible();
      
      // Should show post metadata
      await expect(page.locator('[data-testid="reading-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="publish-date"]')).toBeVisible();
    });

    test('should show table of contents for long posts', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Open a long post
      await blogPage.openPost('Getting Started with Next.js 14');
      
      // Should show table of contents
      const toc = page.locator('[data-testid="table-of-contents"]');
      await expect(toc).toBeVisible();
      
      // Should have links to sections
      const tocLinks = toc.locator('a');
      await expect(tocLinks).toHaveCount(4);
      
      // Clicking TOC link should scroll to section
      await tocLinks.first().click();
      
      // Should scroll to the section
      const section = page.locator('h2').first();
      await expect(section).toBeInViewport();
    });

    test('should track reading progress', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Open a post
      await blogPage.openPost('Building a REST API with NestJS');
      
      // Progress bar should be visible
      const progressBar = page.locator('[data-testid="reading-progress"]');
      await expect(progressBar).toBeVisible();
      
      // Initially at 0%
      let progress = await progressBar.evaluate((el) => {
        return window.getComputedStyle(el).width;
      });
      expect(parseInt(progress)).toBeLessThan(10);
      
      // Scroll to middle
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      
      // Progress should update
      progress = await progressBar.evaluate((el) => {
        return window.getComputedStyle(el).width;
      });
      expect(parseInt(progress)).toBeGreaterThan(40);
      
      // Scroll to end
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Should be at 100%
      progress = await progressBar.evaluate((el) => {
        return window.getComputedStyle(el).width;
      });
      expect(parseInt(progress)).toBeGreaterThan(90);
    });

    test('should show related posts', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Open a post
      await blogPage.openPost('Getting Started with Next.js 14');
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Should show related posts section
      const relatedSection = page.locator('[data-testid="related-posts"]');
      await expect(relatedSection).toBeVisible();
      
      // Should have 3-4 related posts
      const relatedPosts = relatedSection.locator('article');
      const count = await relatedPosts.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(4);
    });
  });

  test.describe('Post Interactions', () => {
    test('should like a post', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      const firstPost = blogPage.postCards.first();
      const postTitle = await firstPost.locator('h2').textContent();
      
      // Get initial like count
      const initialLikes = await firstPost.locator('[data-testid="like-count"]').textContent();
      const initialCount = parseInt(initialLikes?.replace(/[^0-9]/g, '') || '0');
      
      // Like the post
      await blogPage.likePost(postTitle || '');
      
      // Like count should increase
      const newLikes = await firstPost.locator('[data-testid="like-count"]').textContent();
      const newCount = parseInt(newLikes?.replace(/[^0-9]/g, '') || '0');
      
      expect(newCount).toBe(initialCount + 1);
      
      // Like button should be active
      await expect(firstPost.locator('[data-testid="like-button"]')).toHaveAttribute('data-liked', 'true');
      
      // Unlike the post
      await blogPage.likePost(postTitle || '');
      
      // Like count should decrease
      const finalLikes = await firstPost.locator('[data-testid="like-count"]').textContent();
      const finalCount = parseInt(finalLikes?.replace(/[^0-9]/g, '') || '0');
      
      expect(finalCount).toBe(initialCount);
    });

    test('should share a post', async ({ page, blogPage, context }) => {
      await blogPage.goto();
      
      const firstPost = blogPage.postCards.first();
      const postTitle = await firstPost.locator('h2').textContent();
      
      // Share the post
      await blogPage.sharePost(postTitle || '');
      
      // Should show share dialog
      const shareDialog = page.locator('[data-testid="share-dialog"]');
      await expect(shareDialog).toBeVisible();
      
      // Should have share options
      await expect(shareDialog.getByText(/twitter/i)).toBeVisible();
      await expect(shareDialog.getByText(/facebook/i)).toBeVisible();
      await expect(shareDialog.getByText(/linkedin/i)).toBeVisible();
      await expect(shareDialog.getByText(/copy link/i)).toBeVisible();
      
      // Copy link
      await shareDialog.getByText(/copy link/i).click();
      
      // Should show success message
      await expect(page.getByText(/link copied/i)).toBeVisible();
      
      // Check clipboard (if supported)
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('/blog/');
    });

    test('should bookmark a post', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      const firstPost = blogPage.postCards.first();
      const postTitle = await firstPost.locator('h2').textContent();
      
      // Bookmark the post
      await firstPost.locator('[data-testid="bookmark-button"]').click();
      
      // Should show success message
      await expect(page.getByText(/bookmarked/i)).toBeVisible();
      
      // Bookmark button should be active
      await expect(firstPost.locator('[data-testid="bookmark-button"]')).toHaveAttribute('data-bookmarked', 'true');
      
      // Go to bookmarks page
      await page.goto('/bookmarks');
      
      // Should show bookmarked post
      await expect(page.getByText(postTitle || '')).toBeVisible();
    });

    test('should add comment to post', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Open a post
      await blogPage.openPost('Getting Started with Next.js 14');
      
      // Scroll to comments section
      await page.locator('[data-testid="comments-section"]').scrollIntoViewIfNeeded();
      
      // Should show comment form
      const commentForm = page.locator('[data-testid="comment-form"]');
      await expect(commentForm).toBeVisible();
      
      // Add a comment
      await commentForm.locator('textarea').fill('Great article! Very helpful.');
      await commentForm.getByRole('button', { name: /post comment/i }).click();
      
      // Should show success message
      await expect(page.getByText(/comment posted/i)).toBeVisible();
      
      // Comment should appear in list
      await expect(page.getByText('Great article! Very helpful.')).toBeVisible();
      
      // Comment count should update
      const commentCount = await page.locator('[data-testid="comment-count"]').textContent();
      expect(parseInt(commentCount?.replace(/[^0-9]/g, '') || '0')).toBeGreaterThan(0);
    });

    test('should report inappropriate content', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Open a post
      await blogPage.openPost('Getting Started with Next.js 14');
      
      // Click report button
      await page.locator('[data-testid="report-button"]').click();
      
      // Should show report dialog
      const reportDialog = page.locator('[data-testid="report-dialog"]');
      await expect(reportDialog).toBeVisible();
      
      // Select reason
      await reportDialog.getByLabel(/spam/i).check();
      
      // Add details
      await reportDialog.locator('textarea').fill('This appears to be spam content');
      
      // Submit report
      await reportDialog.getByRole('button', { name: /submit report/i }).click();
      
      // Should show success message
      await expect(page.getByText(/report submitted/i)).toBeVisible();
    });
  });

  test.describe('Author Pages', () => {
    test('should navigate to author profile', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Click on author name
      const authorName = await blogPage.postCards.first().locator('[data-testid="post-author"]').textContent();
      await blogPage.postCards.first().locator('[data-testid="post-author"]').click();
      
      // Should navigate to author page
      await expect(page).toHaveURL(/\/profile\/.+/);
      
      // Should show author info
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(authorName || '');
      await expect(page.locator('[data-testid="author-bio"]')).toBeVisible();
      await expect(page.locator('[data-testid="author-stats"]')).toBeVisible();
      
      // Should show author's posts
      const authorPosts = page.locator('[data-testid="author-posts"] article');
      await expect(authorPosts).toHaveCount(10);
    });

    test('should follow/unfollow author', async ({ page, blogPage }) => {
      await blogPage.goto();
      
      // Navigate to author profile
      await blogPage.postCards.first().locator('[data-testid="post-author"]').click();
      
      // Follow author
      const followButton = page.locator('[data-testid="follow-button"]');
      await followButton.click();
      
      // Button should change to "Following"
      await expect(followButton).toHaveText(/following/i);
      
      // Follower count should increase
      const followerCount = page.locator('[data-testid="follower-count"]');
      const initialCount = parseInt(await followerCount.textContent() || '0');
      
      // Unfollow
      await followButton.click();
      
      // Button should change back to "Follow"
      await expect(followButton).toHaveText(/follow/i);
      
      // Follower count should decrease
      const newCount = parseInt(await followerCount.textContent() || '0');
      expect(newCount).toBe(initialCount - 1);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page, blogPage }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await blogPage.goto();
      
      // Mobile menu should be visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Posts should stack vertically
      const firstPost = blogPage.postCards.first();
      const boundingBox = await firstPost.boundingBox();
      expect(boundingBox?.width).toBeLessThan(375);
      
      // Open mobile menu
      await page.locator('[data-testid="mobile-menu-button"]').click();
      
      // Menu should slide in
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Categories should be in mobile menu
      await expect(page.locator('[data-testid="mobile-menu"]').getByText(/categories/i)).toBeVisible();
    });

    test('should be responsive on tablet', async ({ page, blogPage }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await blogPage.goto();
      
      // Should show 2 columns
      const posts = await blogPage.postCards.all();
      const firstBox = await posts[0].boundingBox();
      const secondBox = await posts[1].boundingBox();
      
      // Posts should be side by side
      expect(firstBox?.y).toBe(secondBox?.y);
    });
  });
});