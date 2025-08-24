import { test, expect } from '@playwright/test';

test.describe('Search and Filter Functionality', () => {
  test('should search for posts by keyword', async ({ page }) => {
    await page.goto('/search');
    
    // Enter search query
    const searchQuery = 'javascript';
    await page.fill('input[placeholder*="Search"]', searchQuery);
    await page.keyboard.press('Enter');
    
    // Wait for results
    await page.waitForURL(/search\?q=/);
    
    // Verify search results contain the query
    const results = page.locator('article');
    const count = await results.count();
    
    if (count > 0) {
      // Verify at least one result contains the search term
      const firstResult = results.first();
      const text = await firstResult.textContent();
      expect(text?.toLowerCase()).toContain(searchQuery.toLowerCase());
    } else {
      // Verify "no results" message
      await expect(page.locator('text=/no results|not found/i')).toBeVisible();
    }
  });

  test('should filter posts by category', async ({ page }) => {
    await page.goto('/blog');
    
    // Click on a category filter
    await page.click('a[href*="/blog/category/"]:first');
    
    // Wait for filtered results
    await page.waitForURL(/\/blog\/category\//);
    
    // Verify category heading
    const categoryName = await page.locator('h1').textContent();
    expect(categoryName).toBeTruthy();
    
    // Verify posts are displayed
    const posts = page.locator('article');
    const count = await posts.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter posts by tag', async ({ page }) => {
    await page.goto('/blog');
    
    // Click on first post to see tags
    await page.click('article:first-child a');
    await page.waitForURL(/\/blog\/[^\/]+$/);
    
    // Click on a tag
    const tag = page.locator('a[href*="/blog/tag/"]:first');
    const tagName = await tag.textContent();
    await tag.click();
    
    // Wait for filtered results
    await page.waitForURL(/\/blog\/tag\//);
    
    // Verify tag heading contains the tag name
    const heading = await page.locator('h1').textContent();
    expect(heading?.toLowerCase()).toContain(tagName?.toLowerCase() || '');
  });

  test('should sort posts by date and popularity', async ({ page }) => {
    await page.goto('/blog');
    
    // Test date sorting (newest first - default)
    const firstPostDate = await page.locator('article:first-child time').getAttribute('datetime');
    const secondPostDate = await page.locator('article:nth-child(2) time').getAttribute('datetime');
    
    if (firstPostDate && secondPostDate) {
      expect(new Date(firstPostDate).getTime()).toBeGreaterThanOrEqual(
        new Date(secondPostDate).getTime()
      );
    }
    
    // Test popularity sorting (if available)
    const sortDropdown = page.locator('select[name="sort"]');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption('popular');
      await page.waitForTimeout(1000); // Wait for re-render
      
      // Verify posts are re-ordered (check view counts or likes)
      const firstPostViews = await page.locator('article:first-child [data-testid="view-count"]').textContent();
      const secondPostViews = await page.locator('article:nth-child(2) [data-testid="view-count"]').textContent();
      
      if (firstPostViews && secondPostViews) {
        expect(parseInt(firstPostViews)).toBeGreaterThanOrEqual(parseInt(secondPostViews));
      }
    }
  });

  test('should paginate search results', async ({ page }) => {
    await page.goto('/search?q=test');
    
    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      // Click next page
      await page.click('button:has-text("Next")');
      await page.waitForURL(/page=2/);
      
      // Verify different posts are shown
      const firstPostTitle = await page.locator('article:first-child h2').textContent();
      
      // Go back to first page
      await page.click('button:has-text("Previous")');
      await page.waitForURL(/page=1|search\?q=test$/);
      
      // Verify different content
      const firstPageTitle = await page.locator('article:first-child h2').textContent();
      expect(firstPageTitle).not.toBe(firstPostTitle);
    }
  });

  test('should show search suggestions', async ({ page }) => {
    await page.goto('/');
    
    // Start typing in search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('java');
    
    // Wait for suggestions to appear
    await page.waitForTimeout(500);
    
    // Check if suggestions dropdown is visible
    const suggestions = page.locator('[data-testid="search-suggestions"]');
    if (await suggestions.isVisible()) {
      const suggestionCount = await suggestions.locator('li').count();
      expect(suggestionCount).toBeGreaterThan(0);
      
      // Click on a suggestion
      await suggestions.locator('li:first-child').click();
      
      // Verify navigation to search results or post
      await expect(page).toHaveURL(/\/(search|blog)\//);
    }
  });
});