import { test as base, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { DashboardPage } from '../pages/dashboard.page';
import { BlogPage } from '../pages/blog.page';
import { PostPage } from '../pages/post.page';

// Define custom fixtures
type TestFixtures = {
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  blogPage: BlogPage;
  postPage: PostPage;
};

// Extend test with custom fixtures
export const test = base.extend<TestFixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  
  blogPage: async ({ page }, use) => {
    await use(new BlogPage(page));
  },
  
  postPage: async ({ page }, use) => {
    await use(new PostPage(page));
  },
});

export { expect };