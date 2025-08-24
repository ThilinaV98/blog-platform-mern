import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { authStore } from '@/store/authStore';
import { usersAPI } from '@/lib/api/users';
import { AllTheProviders } from '../utils/test-utils';

// Mock the users API
jest.mock('@/lib/api/users', () => ({
  usersAPI: {
    getProfile: jest.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth store to initial state
    authStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  it('returns initial auth state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns authenticated state when user is logged in', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
    };

    authStore.setState({
      user: mockUser,
      isAuthenticated: true,
      accessToken: 'mock-token',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    await act(async () => {
      await result.current.login('test@example.com', 'Test123!@#');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('handles login failure', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    await act(async () => {
      try {
        await result.current.login('wrong@example.com', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('handles registration successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    await act(async () => {
      await result.current.register(
        'newuser@example.com',
        'newuser',
        'Test123!@#',
        'New User'
      );
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('handles logout', async () => {
    // Set up authenticated state
    authStore.setState({
      user: { id: '1', email: 'test@example.com', username: 'testuser' },
      isAuthenticated: true,
      accessToken: 'mock-token',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('refreshes user data successfully', async () => {
    const mockUpdatedUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Updated User',
      profile: {
        bio: 'New bio',
      },
    };

    (usersAPI.getProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

    authStore.setState({
      user: { id: '1', email: 'test@example.com', username: 'testuser' },
      isAuthenticated: true,
      accessToken: 'mock-token',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    await act(async () => {
      await result.current.refreshUser();
    });

    await waitFor(() => {
      expect(usersAPI.getProfile).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUpdatedUser);
    });
  });

  it('handles refresh user failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (usersAPI.getProfile as jest.Mock).mockRejectedValue(new Error('Network error'));

    authStore.setState({
      user: { id: '1', email: 'test@example.com', username: 'testuser' },
      isAuthenticated: true,
      accessToken: 'mock-token',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to refresh user data:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('reflects loading state during operations', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    // Set loading state
    act(() => {
      authStore.setState({ isLoading: true });
    });

    expect(result.current.isLoading).toBe(true);

    // Clear loading state
    act(() => {
      authStore.setState({ isLoading: false });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('reflects error state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    const errorMessage = 'Authentication failed';
    
    act(() => {
      authStore.setState({ error: errorMessage });
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('provides all expected functions', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.refreshUser).toBe('function');
  });

  it('updates state reactively when auth store changes', () => {
    const { result, rerender } = renderHook(() => useAuth(), {
      wrapper: AllTheProviders,
    });

    expect(result.current.isAuthenticated).toBe(false);

    // Update auth store
    act(() => {
      authStore.setState({
        user: { id: '1', email: 'test@example.com', username: 'testuser' },
        isAuthenticated: true,
      });
    });

    rerender();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
    });
  });
});