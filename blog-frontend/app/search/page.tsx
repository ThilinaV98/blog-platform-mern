'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Eye, Heart, MessageCircle, User, Tag, Folder, Filter } from 'lucide-react';
import { format } from 'date-fns';
import SearchBar from '@/components/search/SearchBar';
import { PostCard } from '@/components/posts/PostCard';
import { searchAPI } from '@/lib/api/search';
import { categoriesAPI } from '@/lib/api/categories';
import { postsAPI } from '@/lib/api/posts';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const sortBy = (searchParams.get('sortBy') as 'relevance' | 'date' | 'popularity') || 'relevance';
  
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await searchAPI.searchPosts({
          query,
          page,
          limit: 10,
          category: category || undefined,
          tags: tag ? [tag] : undefined,
          sortBy
        });
        setResults(searchResults);
        
        // Save search to recent
        searchAPI.saveRecentSearch(query);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, category, tag, sortBy, page]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesData, tagsData] = await Promise.all([
          categoriesAPI.getCategoriesWithCounts(),
          postsAPI.getTags()
        ]);
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (error) {
        console.error('Failed to fetch filters:', error);
      }
    };

    fetchFilters();
  }, []);

  const handleSortChange = (newSort: 'relevance' | 'date' | 'popularity') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', newSort);
    window.location.href = `/search?${params.toString()}`;
  };

  const handleFilterChange = (type: 'category' | 'tag', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(type, value);
    } else {
      params.delete(type);
    }
    window.location.href = `/search?${params.toString()}`;
  };

  if (!query) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Posts</h1>
          <p className="text-gray-600 mb-8">Enter a search term to find posts</p>
          <div className="max-w-2xl mx-auto">
            <SearchBar placeholder="Search for posts..." autoFocus />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="max-w-2xl mx-auto mb-6">
          <SearchBar placeholder={`Search for "${query}"...`} />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Search Results for "{query}"
            </h1>
            {results && (
              <p className="text-gray-600 mt-1">
                {results.searchMeta.resultsFound} {results.searchMeta.resultsFound === 1 ? 'result' : 'results'} found
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="relevance">Most Relevant</option>
              <option value="date">Most Recent</option>
              <option value="popularity">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <aside className={`${showFilters ? 'block' : 'hidden'} sm:block w-full sm:w-64 flex-shrink-0`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
            
            {/* Categories Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                <Folder className="inline w-4 h-4 mr-1" />
                Category
              </h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="category"
                    value=""
                    checked={!category}
                    onChange={() => handleFilterChange('category', '')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">All Categories</span>
                </label>
                {categories.slice(0, 5).map((cat) => (
                  <label key={cat.category._id} className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      value={cat.category.name}
                      checked={category === cat.category.name}
                      onChange={() => handleFilterChange('category', cat.category.name)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      {cat.category.name} ({cat.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline w-4 h-4 mr-1" />
                Popular Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => handleFilterChange('tag', tag === t.tag ? '' : t.tag)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      tag === t.tag
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t.tag} ({t.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Search Results */}
        <div className="flex-1">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : results?.posts.length > 0 ? (
            <div className="space-y-4">
              {results.posts.map((post: any) => (
                <PostCard key={post._id} post={post} />
              ))}
              
              {/* Pagination */}
              {results.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!results.meta.hasPrev}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Page {page} of {results.meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!results.meta.hasNext}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600 mb-4">No results found for "{query}"</p>
              
              {/* Suggestions */}
              {results?.searchMeta.suggestions.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 mb-3">You might be interested in:</p>
                  <div className="space-y-2">
                    {results.searchMeta.suggestions.map((suggestion: any) => (
                      <Link
                        key={suggestion._id}
                        href={`/blog/${suggestion.slug}`}
                        className="block text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {suggestion.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-3">Try:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Using different keywords</li>
                  <li>• Removing filters</li>
                  <li>• Checking your spelling</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}