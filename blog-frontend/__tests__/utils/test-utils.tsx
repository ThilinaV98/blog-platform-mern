import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth/AuthProvider';
import userEvent from '@testing-library/user-event';

// Create a custom render function that includes providers
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllTheProvidersProps {
  children: React.ReactNode;
}

export const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const user = userEvent.setup();
  
  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatar: null,
  role: 'user',
  ...overrides,
});

export const createMockPost = (overrides = {}) => ({
  _id: '1',
  title: 'Test Post',
  slug: 'test-post',
  content: '<p>Test content</p>',
  excerpt: 'Test excerpt',
  coverImage: null,
  author: {
    _id: '1',
    username: 'testuser',
    profile: {
      displayName: 'Test User',
      avatar: null,
    },
  },
  category: 'Technology',
  tags: ['test'],
  status: 'published',
  publishedAt: new Date().toISOString(),
  featured: false,
  visibility: 'public',
  metadata: {
    readTime: 1,
    wordCount: 100,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockAuthResponse = (overrides = {}) => ({
  user: createMockUser(),
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  ...overrides,
});

// Helper to wait for async updates
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));