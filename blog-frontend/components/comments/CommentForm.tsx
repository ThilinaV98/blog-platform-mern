'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getImageUrl } from '@/lib/utils/image';
import { useAuthStore } from '@/store/authStore';
import { useCommentStore } from '@/store/commentStore';
import { toast } from 'react-hot-toast';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CommentForm({
  postId,
  parentId,
  onCancel,
  onSuccess,
  placeholder = 'Write a comment...',
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const { createComment } = useCommentStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to comment');
      return;
    }

    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (content.length > 1000) {
      toast.error('Comment cannot exceed 1000 characters');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createComment(postId, content.trim(), parentId);
      setContent('');
      toast.success(parentId ? 'Reply posted!' : 'Comment posted!');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p>Please <a href="/login" className="text-blue-600 hover:underline">login</a> to comment</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start space-x-3">
        {user?.profile?.avatar ? (
          <img
            src={getImageUrl(user.profile.avatar)}
            alt={user.profile.displayName || user.username}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {(user?.profile?.displayName || user?.username || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px] resize-none"
            maxLength={1000}
            autoFocus={autoFocus}
            disabled={isSubmitting}
          />
          <div className="mt-1 text-xs text-gray-500 text-right">
            {content.length}/1000 characters
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Posting...' : (parentId ? 'Reply' : 'Comment')}
        </Button>
      </div>
    </form>
  );
}