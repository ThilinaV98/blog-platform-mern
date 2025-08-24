'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirect if not admin
    if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-section">
      {/* Admin-specific styling or components can go here */}
      {children}
    </div>
  );
}