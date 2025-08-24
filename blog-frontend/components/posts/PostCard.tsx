import Link from 'next/link';
import { Post } from '@/lib/api/posts';
import { format } from 'date-fns';
import { Calendar, Clock, User, Eye, MessageCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/utils/image';
import { LikeButton } from '@/components/interactions/LikeButton';
import { likesAPI } from '@/lib/api/likes';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const authorName = typeof post.author === 'object' 
    ? post.author.profile?.displayName || post.author.username
    : 'Anonymous';

  const authorAvatar = typeof post.author === 'object' && post.author.profile?.avatar
    ? getImageUrl(post.author.profile.avatar)
    : null;

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover Image */}
      {post.coverImage && (
        <Link href={`/blog/${post.slug}`}>
          <div className="aspect-w-16 aspect-h-9 relative h-48 overflow-hidden">
            <img
              src={getImageUrl(post.coverImage)}
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            {post.featured && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                Featured
              </span>
            )}
          </div>
        </Link>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Category & Tags */}
        <div className="flex items-center gap-2 mb-3">
          {post.category && (
            <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded">
              {post.category}
            </span>
          )}
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <Link href={`/blog/${post.slug}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-primary-600 transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}

        {/* Author & Meta */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{authorName}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(post.publishedAt || post.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.metadata.readTime} min
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              {post.metadata.views}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <MessageCircle className="w-4 h-4" />
              {post.metadata.comments}
            </span>
          </div>
          
          {/* Like Button */}
          <LikeButton
            targetId={post._id}
            targetType="post"
            initialLiked={post.isLiked}
            initialCount={post.metadata.likes}
            onLike={(targetId, targetType) => likesAPI.like(targetId, targetType)}
            onUnlike={(targetId, targetType) => likesAPI.unlike(targetId, targetType)}
            variant="minimal"
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}