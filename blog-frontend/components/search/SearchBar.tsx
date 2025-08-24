'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { searchAPI } from '@/lib/api/search';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  showRecent?: boolean;
  autoFocus?: boolean;
}

export default function SearchBar({ 
  placeholder = 'Search posts...', 
  className = '',
  showRecent = true,
  autoFocus = false
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches
  useEffect(() => {
    if (showRecent) {
      setRecentSearches(searchAPI.getRecentSearches());
    }
  }, [showRecent]);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchAPI.getSearchSuggestions(debouncedQuery);
        setSuggestions(results);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    // Save to recent searches
    searchAPI.saveRecentSearch(searchQuery);
    
    // Navigate to search results
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    
    // Reset state
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (search: string) => {
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const showDropdown = isOpen && (
    (query.length > 0 && suggestions.length > 0) ||
    (query.length === 0 && recentSearches.length > 0 && showRecent)
  );

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {/* Search Suggestions */}
          {query.length > 0 && suggestions.length > 0 && (
            <div>
              <div className="px-4 py-2 text-sm text-gray-500 border-b">
                <TrendingUp className="inline w-4 h-4 mr-1" />
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <span className="text-gray-700">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && showRecent && (
            <div>
              <div className="px-4 py-2 text-sm text-gray-500 border-b flex justify-between items-center">
                <span>
                  <Clock className="inline w-4 h-4 mr-1" />
                  Recent Searches
                </span>
                <button
                  onClick={() => {
                    searchAPI.clearRecentSearches();
                    setRecentSearches([]);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 group"
                >
                  <button
                    onClick={() => handleSearch(search)}
                    className="flex-1 text-left text-gray-700"
                  >
                    {search}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRecent(search);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Loading State */}
          {loading && query.length > 0 && (
            <div className="px-4 py-3 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-sm">Searching...</span>
            </div>
          )}

          {/* No Results */}
          {!loading && query.length > 1 && suggestions.length === 0 && (
            <div className="px-4 py-3 text-center text-gray-500 text-sm">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}