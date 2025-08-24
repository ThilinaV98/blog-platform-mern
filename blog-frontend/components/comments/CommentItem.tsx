'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, MoreVertical, Edit2, Trash2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Comment, CommentAuthor } from '@/lib/api/comments';
import { useAuthStore } from '@/store/authStore';
import { useCommentStore } from '@/store/commentStore';
import { LikeButton } from '@/components/interactions/LikeButton';
import { likesAPI } from '@/lib/api/likes';
import CommentForm from './CommentForm';
import { toast } from 'react-hot-toast';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReply?: () => void;
  showReplies?: boolean;
  maxDepth?: number;
}

export default function CommentItem({
  comment,
  postId,
  onReply,
  showReplies = true,
  maxDepth = 3,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('spam');
  const { user, isAuthenticated } = useAuthStore();
  const { updateComment, deleteComment, reportComment } = useCommentStore();

  const author = comment.userId as CommentAuthor;
  const isOwner = isAuthenticated && user?.id === author?._id;
  const canReply = comment.depth < maxDepth - 1 && !comment.isDeleted;

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateComment(comment._id, editContent.trim());
      setIsEditing(false);
      toast.success('Comment updated');
    } catch (error) {
      toast.error('Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment(comment._id, postId);
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };


  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Please provide a reason for reporting');
      return;
    }

    try {
      const reason = `${reportCategory}: ${reportReason.trim()}`;
      await reportComment(comment._id, reason);
      toast.success('Comment reported');
      setShowReportDialog(false);
      setReportReason('');
      setReportCategory('spam');
    } catch (error) {
      toast.error('Failed to report comment');
    }
  };

  return (
    <div className={`${comment.depth > 0 ? 'ml-12' : ''}`}>
      <div className="flex space-x-3">
        {/* Author Avatar */}
        {author.profile?.avatar ? (
          <img
            src={author.profile.avatar}
            alt={author.profile.displayName || author.username}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {(author.profile?.displayName || author.username || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1">
          {/* Author Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium">
                {author.profile?.displayName || author.username}
              </span>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>

            {/* Actions Menu */}
            {!comment.isDeleted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this comment? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  {!isOwner && isAuthenticated && (
                    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Flag className="mr-2 h-4 w-4" />
                          Report
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Report Comment</DialogTitle>
                          <DialogDescription>
                            Help us maintain a safe community by reporting inappropriate content.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <label htmlFor="category" className="text-sm font-medium">
                              Category
                            </label>
                            <select
                              id="category"
                              value={reportCategory}
                              onChange={(e) => setReportCategory(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="spam">Spam</option>
                              <option value="harassment">Harassment</option>
                              <option value="inappropriate">Inappropriate Content</option>
                              <option value="misinformation">Misinformation</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <label htmlFor="reason" className="text-sm font-medium">
                              Reason (optional)
                            </label>
                            <Textarea
                              id="reason"
                              placeholder="Please provide additional details about why you're reporting this comment..."
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="min-h-[80px] resize-none"
                              maxLength={500}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleReport} className="bg-red-600 hover:bg-red-700">
                            Report Comment
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Comment Content */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={1000}
                disabled={isSubmitting}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={isSubmitting || !editContent.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className={`mt-1 ${comment.isDeleted ? 'text-gray-400 italic' : ''}`}>
              {comment.content}
            </div>
          )}

          {/* Interaction Buttons */}
          {!comment.isDeleted && !isEditing && (
            <div className="mt-2 flex items-center gap-4">
              <LikeButton
                targetId={comment._id}
                targetType="comment"
                initialLiked={comment.isLiked}
                initialCount={comment.likes || 0}
                onLike={(targetId, targetType) => likesAPI.like(targetId, targetType)}
                onUnlike={(targetId, targetType) => likesAPI.unlike(targetId, targetType)}
                variant="minimal"
                size="sm"
              />
              
              {canReply && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>
                    Reply
                    {comment.repliesCount && comment.repliesCount > 0 && (
                      <span> ({comment.repliesCount})</span>
                    )}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-4">
              <CommentForm
                postId={postId}
                parentId={comment._id}
                placeholder={`Reply to ${author.profile?.displayName || author.username}...`}
                autoFocus
                onCancel={() => setIsReplying(false)}
                onSuccess={() => {
                  setIsReplying(false);
                  onReply?.();
                }}
              />
            </div>
          )}

          {/* Nested Replies */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  postId={postId}
                  onReply={onReply}
                  showReplies={showReplies}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}