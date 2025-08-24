'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommentStore } from '@/store/commentStore';
import { useAuthStore } from '@/store/authStore';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface CommentListProps {
  postId: string;
  postTitle?: string;
}

export default function CommentList({ postId, postTitle }: CommentListProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { 
    comments, 
    loading, 
    error, 
    hasMore, 
    currentPage,
    fetchComments,
    clearComments 
  } = useCommentStore();
  const { isAuthenticated } = useAuthStore();

  const postComments = comments[postId] || [];
  const hasMoreComments = hasMore[postId] || false;
  const page = currentPage[postId] || 1;

  useEffect(() => {
    // Fetch comments when component mounts
    fetchComments(postId, 1);

    // Cleanup when component unmounts
    return () => {
      clearComments(postId);
    };
  }, [postId]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchComments(postId, page + 1);
    setIsLoadingMore(false);
  };

  const handleCommentAdded = () => {
    // Optionally refresh comments or handle optimistic updates
  };

  if (loading && postComments.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Comments</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Comments</h2>
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Comments {postComments.length > 0 && `(${postComments.length})`}
        </h2>
      </div>

      {/* Comment Form */}
      <div className="pb-6 border-b">
        <CommentForm 
          postId={postId} 
          onSuccess={handleCommentAdded}
          placeholder={`Share your thoughts on "${postTitle || 'this post'}"...`}
        />
      </div>

      {/* Comments List */}
      {postComments.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No comments yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            {isAuthenticated 
              ? "Be the first to share your thoughts!"
              : "Login to join the conversation"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {postComments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              postId={postId}
              onReply={handleCommentAdded}
            />
          ))}
          
          {/* Load More Button */}
          {hasMoreComments && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Comments'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}