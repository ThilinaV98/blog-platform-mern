import React from 'react';
import { render, screen, waitFor } from '../utils/test-utils';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { authStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';

// Mock the router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    // Reset auth store
    authStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshToken: null,
    });
  });

  it('renders children when authenticated and auth is required', () => {
    authStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', username: 'testuser' },
    });

    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated and auth is required', async () => {
    authStore.setState({
      isAuthenticated: false,
      isLoading: false,
      refreshToken: null,
    });

    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
    });
    
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when auth is not required', () => {
    authStore.setState({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <AuthGuard requireAuth={false}>
        <div>Public Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Public Content')).toBeInTheDocument();
  });

  it('shows loading spinner while checking auth', () => {
    authStore.setState({
      isLoading: true,
    });

    const { container } = render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('does not redirect when refresh token exists', () => {
    authStore.setState({
      isAuthenticated: false,
      isLoading: false,
      refreshToken: 'valid-refresh-token',
    });

    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('preserves current pathname in redirect URL', async () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/posts/new');
    
    authStore.setState({
      isAuthenticated: false,
      isLoading: false,
      refreshToken: null,
    });

    render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fdashboard%2Fposts%2Fnew');
    });
  });

  it('renders children immediately when already authenticated', () => {
    authStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', username: 'testuser' },
    });

    const { container } = render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('handles auth state changes', async () => {
    const { rerender } = render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Initially not authenticated
    authStore.setState({
      isAuthenticated: false,
      isLoading: false,
      refreshToken: null,
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });

    // User logs in
    authStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', username: 'testuser' },
    });

    rerender(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('does not render children while loading even if authenticated', () => {
    authStore.setState({
      isAuthenticated: true,
      isLoading: true,
      user: { id: '1', email: 'test@example.com', username: 'testuser' },
    });

    const { container } = render(
      <AuthGuard requireAuth={true}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});