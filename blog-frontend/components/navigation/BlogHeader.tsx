'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import AvatarDropdown from '@/components/ui/AvatarDropdown';

export function BlogHeader() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
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
              {isAuthenticated && (
                <>
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
                </>
              )}
            </div>
          </div>

          <div className="flex items-center">
            {isAuthenticated ? (
              <AvatarDropdown onLogout={handleLogout} />
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}