import apiClient from './client';

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
  author?: string;
  sortBy?: 'relevance' | 'date' | 'popularity';
}

export interface SearchResult {
  posts: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchMeta: {
    query: string;
    resultsFound: number;
    suggestions: any[];
  };
}

export const searchAPI = {
  /**
   * Search posts
   */
  async searchPosts(params: SearchParams): Promise<SearchResult> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('q', params.query);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.category) queryParams.append('category', params.category);
    if (params.tags?.length) {
      params.tags.forEach(tag => queryParams.append('tags', tag));
    }
    if (params.author) queryParams.append('author', params.author);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);

    const response = await apiClient.get(`/posts/search?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const response = await apiClient.get(`/posts/search?q=${query}&limit=5`);
      return response.data.posts.map((post: any) => post.title);
    } catch (error) {
      return [];
    }
  },

  /**
   * Save search to recent searches
   */
  saveRecentSearch(query: string): void {
    const recentSearches = this.getRecentSearches();
    const filtered = recentSearches.filter(q => q !== query);
    const updated = [query, ...filtered].slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  },

  /**
   * Get recent searches
   */
  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem('recentSearches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Clear recent searches
   */
  clearRecentSearches(): void {
    localStorage.removeItem('recentSearches');
  }
};