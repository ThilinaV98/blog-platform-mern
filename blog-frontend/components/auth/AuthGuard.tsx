'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authStore } from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = authStore();

  useEffect(() => {
    // Only handle redirects, don't trigger auth checks
    // AuthProvider handles the initial auth check
    if (!isAuthenticated && requireAuth && !isLoading) {
      // Give AuthProvider a chance to check auth first
      const refreshToken = authStore.getState().refreshToken;
      if (!refreshToken) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isAuthenticated, requireAuth, router, pathname, isLoading]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}