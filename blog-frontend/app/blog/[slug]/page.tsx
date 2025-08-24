'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { postsAPI, Post } from '@/lib/api/posts';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { PostCard } from '@/components/posts/PostCard';
import { BlogHeader } from '@/components/navigation/BlogHeader';
import CommentList from '@/components/comments/CommentList';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  MessageCircle, 
  Share2,
  ArrowLeft,
  Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils/image';
import { LikeButton } from '@/components/interactions/LikeButton';
import { likesAPI } from '@/lib/api/likes';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const slug = params.slug as string;
        const fetchedPost = await postsAPI.getBySlug(slug);
        setPost(fetchedPost);

        // Fetch related posts
        if (fetchedPost._id) {
          try {
            const related = await postsAPI.getRelated(fetchedPost._id, 3);
            setRelatedPosts(related);
          } catch (error) {
            console.error('Failed to fetch related posts:', error);
          }
        }
      } catch (error: any) {
        toast.error('Post not found');
        router.push('/blog');
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchPost();
    }
  }, [params.slug, router]);

  const handleShare = async () => {
    if (!post) return;
    
    const url = window.location.href;
    const title = post.title;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Post not found</p>
        <Link
          href="/blog"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          Back to Blog
        </Link>
      </div>
    );
  }

  const authorName = typeof post.author === 'object' 
    ? post.author.profile?.displayName || post.author.username
    : 'Anonymous';

  const authorAvatar = typeof post.author === 'object' && post.author.profile?.avatar
    ? getImageUrl(post.author.profile.avatar)
    : null;

  return (
    <div className="min-h-screen bg-white">
      <BlogHeader />
      
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Post Header */}
        <header className="mb-8">
          {/* Category & Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {post.category && (
              <span className="px-3 py-1 bg-primary-50 text-primary-700 text-sm font-medium rounded">
                {post.category}
              </span>
            )}
            {post.featured && (
              <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm font-medium rounded">
                Featured
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl text-gray-600 mb-6">
              {post.excerpt}
            </p>
          )}

          {/* Author & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{authorName}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(post.publishedAt || post.createdAt), 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {post.metadata.readTime} min read
                  </span>
                </div>
              </div>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </header>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
            <img
              src={getImageUrl(post.coverImage)}
              alt={post.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-8">
          <RichTextEditor
            content={post.content}
            onChange={() => {}}
            editable={false}
          />
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-6 border-t border-gray-200">
            <Tag className="w-4 h-4 text-gray-500" />
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tags=${tag}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 py-6 border-t border-gray-200">
          <span className="flex items-center gap-2 text-gray-600">
            <Eye className="w-5 h-5" />
            {post.metadata.views} views
          </span>
          <LikeButton
            targetId={post._id}
            targetType="post"
            initialLiked={post.isLiked}
            initialCount={post.metadata.likes}
            onLike={(targetId, targetType) => likesAPI.like(targetId, targetType)}
            onUnlike={(targetId, targetType) => likesAPI.unlike(targetId, targetType)}
            variant="ghost"
            size="md"
            showCount={true}
          />
          <span className="flex items-center gap-2 text-gray-600">
            <MessageCircle className="w-5 h-5" />
            {post.metadata.comments} comments
          </span>
        </div>

        {/* Comments Section */}
        <div className="py-8 border-t border-gray-200">
          <CommentList postId={post._id} postTitle={post.title} />
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Related Posts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <PostCard key={relatedPost._id} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}