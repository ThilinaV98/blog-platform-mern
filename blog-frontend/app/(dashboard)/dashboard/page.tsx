'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { postsAPI } from '@/lib/api/posts';
import { format } from 'date-fns';
import { Eye, Heart, MessageCircle, FileText, TrendingUp, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await postsAPI.getMyStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
          
          {/* Main Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <dt className="text-sm font-medium text-blue-600 truncate">
                    Total Posts
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats?.totalPosts || 0}
                  </dd>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats?.publishedPosts || 0} published
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <dt className="text-sm font-medium text-green-600 truncate">
                    Total Views
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats?.totalViews || 0}
                  </dd>
                  <p className="text-xs text-gray-600 mt-1">
                    Across all posts
                  </p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <dt className="text-sm font-medium text-pink-600 truncate">
                    Total Likes
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats?.totalLikes || 0}
                  </dd>
                  <p className="text-xs text-gray-600 mt-1">
                    From all posts
                  </p>
                </div>
                <Heart className="w-8 h-8 text-pink-500" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <dt className="text-sm font-medium text-purple-600 truncate">
                    Comments
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats?.totalComments || 0}
                  </dd>
                  <p className="text-xs text-gray-600 mt-1">
                    Total received
                  </p>
                </div>
                <MessageCircle className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Post Status Breakdown */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Post Status Breakdown</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Draft Posts</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.draftPosts || 0}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-gray-400" />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Published Posts</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.publishedPosts || 0}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Archived Posts</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.archivedPosts || 0}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Recent Posts */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Posts</h3>
            {stats?.recentPosts && stats.recentPosts.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {stats.recentPosts.map((post: any) => (
                  <div key={post._id} className="flex items-center justify-between bg-white p-3 rounded">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{post.title}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.metadata?.views || 0} views
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          post.status === 'published' 
                            ? 'bg-green-100 text-green-700' 
                            : post.status === 'draft'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/posts/${post._id}/edit`}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                No recent posts
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/posts/new"
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Create New Post
              </Link>
              <Link
                href="/dashboard/posts"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                View All Posts
              </Link>
              <Link
                href="/blog"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Visit Blog
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}