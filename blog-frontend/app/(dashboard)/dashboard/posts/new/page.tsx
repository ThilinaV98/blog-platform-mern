'use client';

import { PostForm } from '@/components/posts/PostForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewPostPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/posts"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Posts
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        <p className="mt-2 text-gray-600">
          Write and publish your new blog post
        </p>
      </div>

      {/* Post Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <PostForm mode="create" />
      </div>
    </div>
  );
}