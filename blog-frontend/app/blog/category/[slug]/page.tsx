'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Folder } from 'lucide-react';
import { PostCard } from '@/components/posts/PostCard';
import { postsAPI } from '@/lib/api/posts';
import { categoriesAPI } from '@/lib/api/categories';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [category, setCategory] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    const fetchCategoryAndPosts = async () => {
      setLoading(true);
      try {
        // Fetch category details
        const categoryData = await categoriesAPI.getBySlug(slug);
        setCategory(categoryData);
        
        // Fetch posts for this category
        const response = await postsAPI.getAll({
          category: categoryData.name,
          page,
          limit: 10,
          status: 'published'
        });
        
        setPosts(response.posts);
        setMeta(response.meta);
      } catch (error) {
        console.error('Failed to fetch category data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndPosts();
  }, [slug, page]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <p className="text-gray-600 mb-8">The category you're looking for doesn't exist.</p>
          <Link
            href="/blog"
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            {category.icon && (
              <div className="flex-shrink-0">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                >
                  <Folder className="w-6 h-6 text-white" />
                </div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-gray-600 mb-4">{category.description}</p>
              )}
              <p className="text-sm text-gray-500">
                {category.postCount} {category.postCount === 1 ? 'post' : 'posts'} in this category
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Posts in {category.name}
        </h2>
        
        {posts.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
            
            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!meta.hasPrev}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {page} of {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!meta.hasNext}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No posts found in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}