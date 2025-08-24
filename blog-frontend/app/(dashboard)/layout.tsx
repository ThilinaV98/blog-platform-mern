'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AvatarDropdown from '@/components/ui/AvatarDropdown';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">Blog Platform</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    href="/blog"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Blog
                  </Link>
                  <Link
                    href="/dashboard"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/posts"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    My Posts
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      href="/dashboard/admin/reports"
                      className="border-transparent text-red-500 hover:border-red-300 hover:text-red-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Reports
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <AvatarDropdown onLogout={handleLogout} />
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}