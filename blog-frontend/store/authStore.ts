import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, User, AuthResponse } from '@/lib/api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Auth operations
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

export const authStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isRefreshing: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),

      login: async (emailOrUsername, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ emailOrUsername, password });
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Login failed',
          });
          throw error;
        }
      },

      register: async (email, username, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({ email, username, password, displayName });
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        const refreshToken = get().refreshToken;
        if (refreshToken) {
          try {
            await authApi.logout(refreshToken);
          } catch (error) {
            // Silent failure - user is logging out anyway
          }
        }
        get().clearAuth();
      },

      checkAuth: async () => {
        // Prevent concurrent refresh attempts
        if (get().isRefreshing) {
          // Refresh already in progress, skip
          return;
        }

        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          get().clearAuth();
          return;
        }

        set({ isLoading: true, isRefreshing: true });
        try {
          const response = await authApi.refresh(refreshToken);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            isRefreshing: false,
            error: null,
          });
        } catch (error: any) {
          // Clear auth state on refresh failure
          get().clearAuth();
          set({ isLoading: false, isRefreshing: false });
        }
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        // Set isAuthenticated based on whether we have a user after rehydration
        if (state?.user) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);

// Export hook for component usage
export const useAuthStore = authStore;