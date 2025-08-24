'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, TrendingUp } from 'lucide-react';
import { postsAPI } from '@/lib/api/posts';

interface PopularTagsProps {
  limit?: number;
  className?: string;
}

export default function PopularTags({ limit = 15, className = '' }: PopularTagsProps) {
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await postsAPI.getTags();
        setTags(data.slice(0, limit));
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [limit]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
        Popular Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag.tag}
            href={`/blog/tag/${encodeURIComponent(tag.tag)}`}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700 transition-colors"
          >
            <Tag className="w-3 h-3 mr-1" />
            {tag.tag}
            <span className="ml-1 text-xs text-gray-500">({tag.count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}