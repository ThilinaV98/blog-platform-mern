'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface LikeButtonProps {
  targetId: string;
  targetType: 'post' | 'comment';
  initialLiked?: boolean;
  initialCount?: number;
  onLike?: (targetId: string, targetType: 'post' | 'comment') => Promise<{ liked: boolean; likesCount: number }>;
  onUnlike?: (targetId: string, targetType: 'post' | 'comment') => Promise<{ liked: boolean; likesCount: number }>;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'minimal';
  disabled?: boolean;
}

export function LikeButton({
  targetId,
  targetType,
  initialLiked = false,
  initialCount = 0,
  onLike,
  onUnlike,
  className,
  showCount = true,
  size = 'md',
  variant = 'default',
  disabled = false,
}: LikeButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || isLoading || !isAuthenticated || !user) {
      return;
    }

    // Clear any previous error
    setError(null);

    // Optimistic update
    const wasLiked = liked;
    const previousCount = likesCount;
    
    setLiked(!wasLiked);
    setLikesCount(wasLiked ? Math.max(0, previousCount - 1) : previousCount + 1);
    setIsLoading(true);

    try {
      let result;
      
      if (wasLiked) {
        if (onUnlike) {
          result = await onUnlike(targetId, targetType);
        } else {
          throw new Error('Unlike handler not provided');
        }
      } else {
        if (onLike) {
          result = await onLike(targetId, targetType);
        } else {
          throw new Error('Like handler not provided');
        }
      }

      // Update with actual server response
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (err) {
      // Revert optimistic update on error
      setLiked(wasLiked);
      setLikesCount(previousCount);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update like status';
      setError(errorMessage);
      
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md';
    
    switch (variant) {
      case 'ghost':
        return cn(
          baseClasses,
          'p-1 hover:bg-gray-100 dark:hover:bg-gray-800',
          liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
        );
      case 'minimal':
        return cn(
          baseClasses,
          'p-0',
          liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
        );
      default:
        return cn(
          baseClasses,
          'px-2 py-1 rounded-full border',
          liked 
            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-red-200 hover:text-red-500'
        );
    }
  };

  if (!isAuthenticated) {
    // Show non-interactive version for unauthenticated users
    return (
      <div className={cn('inline-flex items-center gap-1 text-gray-500', className)}>
        <Heart className={getSizeClasses()} />
        {showCount && <span className="text-sm">{likesCount}</span>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn(
          getButtonClasses(),
          disabled && 'opacity-50 cursor-not-allowed',
          isLoading && 'cursor-wait',
          className
        )}
        title={liked ? `Unlike this ${targetType}` : `Like this ${targetType}`}
        aria-label={liked ? `Unlike this ${targetType}` : `Like this ${targetType}`}
      >
        <Heart 
          className={cn(
            getSizeClasses(),
            'transition-all duration-200',
            liked ? 'fill-current' : '',
            isLoading && 'animate-pulse'
          )} 
        />
        {showCount && (
          <span 
            className={cn(
              'text-sm font-medium transition-all duration-200',
              size === 'sm' ? 'text-xs' : '',
              size === 'lg' ? 'text-base' : ''
            )}
          >
            {likesCount}
          </span>
        )}
      </button>

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-red-100 border border-red-200 text-red-700 text-xs rounded shadow-lg whitespace-nowrap z-10">
          {error}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-200"></div>
        </div>
      )}
    </div>
  );
}