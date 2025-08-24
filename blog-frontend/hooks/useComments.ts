import { useEffect } from 'react';
import { useCommentStore } from '@/store/commentStore';

export function useComments(postId: string) {
  const {
    comments,
    loading,
    error,
    hasMore,
    currentPage,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    toggleLike,
    clearComments,
  } = useCommentStore();

  const postComments = comments[postId] || [];
  const hasMoreComments = hasMore[postId] || false;
  const page = currentPage[postId] || 1;

  useEffect(() => {
    if (postId && postComments.length === 0) {
      fetchComments(postId, 1);
    }

    return () => {
      // Optional: clear comments when component unmounts
      // clearComments(postId);
    };
  }, [postId]);

  const loadMore = async () => {
    if (hasMoreComments && !loading) {
      await fetchComments(postId, page + 1);
    }
  };

  const addComment = async (content: string, parentId?: string) => {
    return await createComment(postId, content, parentId);
  };

  const editComment = async (commentId: string, content: string) => {
    return await updateComment(commentId, content);
  };

  const removeComment = async (commentId: string) => {
    return await deleteComment(commentId, postId);
  };

  const likeComment = async (commentId: string) => {
    return await toggleLike(commentId, postId);
  };

  const refresh = async () => {
    clearComments(postId);
    await fetchComments(postId, 1);
  };

  return {
    comments: postComments,
    loading,
    error,
    hasMore: hasMoreComments,
    currentPage: page,
    loadMore,
    addComment,
    editComment,
    removeComment,
    likeComment,
    refresh,
  };
}