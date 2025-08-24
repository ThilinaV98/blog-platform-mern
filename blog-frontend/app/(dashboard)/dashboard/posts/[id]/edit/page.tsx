'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PostForm } from '@/components/posts/PostForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { postsAPI, Post } from '@/lib/api/posts';
import { toast } from 'react-hot-toast';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postId = params.id as string;
        const fetchedPost = await postsAPI.getById(postId);
        setPost(fetchedPost);
      } catch (error: any) {
        toast.error('Failed to load post');
        router.push('/dashboard/posts');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPost();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Post not found</p>
        <Link
          href="/dashboard/posts"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          Back to Posts
        </Link>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Edit Post</h1>
        <p className="mt-2 text-gray-600">
          Update your blog post
        </p>
      </div>

      {/* Post Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <PostForm mode="edit" post={post} />
      </div>
    </div>
  );
}