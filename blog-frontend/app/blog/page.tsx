'use client';

import { useEffect, useState } from 'react';
import { PostCard } from '@/components/posts/PostCard';
import { BlogHeader } from '@/components/navigation/BlogHeader';
import SearchBar from '@/components/search/SearchBar';
import PopularTags from '@/components/tags/PopularTags';
import { postsAPI, Post, PostQueryParams } from '@/lib/api/posts';
import { Search, Filter, Folder } from 'lucide-react';

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'metadata.views' | 'metadata.likes'>('createdAt');

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params: PostQueryParams = {
          page: currentPage,
          limit: 12,
          search: searchQuery,
          category: selectedCategory || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          sortBy,
          sortOrder: 'desc',
        };

        const response = await postsAPI.getAll(params);
        setPosts(response.posts);
        setTotalPages(response.meta.totalPages);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, searchQuery, selectedCategory, selectedTags, sortBy]);

  // Fetch categories and tags
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [categoriesData, tagsData] = await Promise.all([
          postsAPI.getCategories(),
          postsAPI.getTags(),
        ]);
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };

    fetchMetadata();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogHeader />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-xl opacity-90">
            Discover stories, thinking, and expertise from writers on any topic.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-1/4">
            {/* Search */}
            <div className="mb-6">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </form>
            </div>

            {/* Sort */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Sort By</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="createdAt">Latest</option>
                <option value="metadata.views">Most Viewed</option>
                <option value="metadata.likes">Most Liked</option>
              </select>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`block w-full text-left px-3 py-2 rounded ${
                      selectedCategory === ''
                        ? 'bg-primary-100 text-primary-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map(({ category, count }) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`block w-full text-left px-3 py-2 rounded ${
                        selectedCategory === category
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {category} ({count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 10).map(({ tag, count }) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-sm rounded-full ${
                        selectedTags.includes(tag)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {tag} ({count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="lg:w-3/4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No posts found</p>
                <p className="text-gray-500 mt-2">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}