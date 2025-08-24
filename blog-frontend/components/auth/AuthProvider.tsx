'use client';

import { useEffect } from 'react';
import { authStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check if we have a refresh token on mount
    const refreshToken = authStore.getState().refreshToken;
    if (refreshToken) {
      // Try to refresh the access token
      authStore.getState().checkAuth();
    }
  }, []);

  return <>{children}</>;
}