import { create } from 'zustand';
import { Comment, commentsAPI, CreateCommentDto, UpdateCommentDto } from '@/lib/api/comments';

interface CommentStore {
  // State
  comments: Record<string, Comment[]>; // Keyed by postId
  loading: boolean;
  error: string | null;
  currentPage: Record<string, number>; // Current page for each post
  hasMore: Record<string, boolean>; // Has more comments for each post
  
  // Actions
  fetchComments: (postId: string, page?: number) => Promise<void>;
  createComment: (postId: string, content: string, parentId?: string) => Promise<Comment>;
  updateComment: (commentId: string, content: string) => Promise<Comment>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
  toggleLike: (commentId: string, postId: string) => Promise<void>;
  reportComment: (commentId: string, reason: string) => Promise<void>;
  clearComments: (postId?: string) => void;
  
  // Optimistic updates
  addOptimisticComment: (postId: string, comment: Comment) => void;
  updateOptimisticComment: (commentId: string, postId: string, updates: Partial<Comment>) => void;
  removeOptimisticComment: (commentId: string, postId: string) => void;
}

export const useCommentStore = create<CommentStore>((set, get) => ({
  comments: {},
  loading: false,
  error: null,
  currentPage: {},
  hasMore: {},

  fetchComments: async (postId: string, page = 1) => {
    set({ loading: true, error: null });
    
    try {
      const response = await commentsAPI.getPostComments(postId, {
        page,
        limit: 20,
        sort: 'newest',
      });
      
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: page === 1 
            ? response.comments 
            : [...(state.comments[postId] || []), ...response.comments],
        },
        currentPage: {
          ...state.currentPage,
          [postId]: page,
        },
        hasMore: {
          ...state.hasMore,
          [postId]: response.meta.hasNext,
        },
        loading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch comments',
        loading: false,
      });
    }
  },

  createComment: async (postId: string, content: string, parentId?: string) => {
    try {
      const newComment = await commentsAPI.createComment(postId, {
        content,
        parentId,
      });
      
      // Add the new comment to the store
      set((state) => {
        const postComments = state.comments[postId] || [];
        
        if (parentId) {
          // If it's a reply, add it to the parent comment's replies
          const updateCommentsWithReply = (comments: Comment[]): Comment[] => {
            return comments.map(comment => {
              if (comment._id === parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment],
                  repliesCount: (comment.repliesCount || 0) + 1,
                };
              } else if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentsWithReply(comment.replies),
                };
              }
              return comment;
            });
          };
          
          return {
            comments: {
              ...state.comments,
              [postId]: updateCommentsWithReply(postComments),
            },
          };
        } else {
          // If it's a root comment, add it to the beginning
          return {
            comments: {
              ...state.comments,
              [postId]: [newComment, ...postComments],
            },
          };
        }
      });
      
      return newComment;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create comment',
      });
      throw error;
    }
  },

  updateComment: async (commentId: string, content: string) => {
    try {
      const updatedComment = await commentsAPI.updateComment(commentId, {
        content,
      });
      
      // Update the comment in the store
      set((state) => {
        const updateCommentInList = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment._id === commentId) {
              return updatedComment;
            } else if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentInList(comment.replies),
              };
            }
            return comment;
          });
        };
        
        const updatedComments = Object.entries(state.comments).reduce(
          (acc, [postId, comments]) => ({
            ...acc,
            [postId]: updateCommentInList(comments),
          }),
          {}
        );
        
        return { comments: updatedComments };
      });
      
      return updatedComment;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update comment',
      });
      throw error;
    }
  },

  deleteComment: async (commentId: string, postId: string) => {
    try {
      await commentsAPI.deleteComment(commentId);
      
      // Mark comment as deleted in the store
      set((state) => {
        const markAsDeleted = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                isDeleted: true,
                content: '[This comment has been deleted]',
              };
            } else if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: markAsDeleted(comment.replies),
              };
            }
            return comment;
          });
        };
        
        return {
          comments: {
            ...state.comments,
            [postId]: markAsDeleted(state.comments[postId] || []),
          },
        };
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete comment',
      });
      throw error;
    }
  },

  toggleLike: async (commentId: string, postId: string) => {
    try {
      const result = await commentsAPI.toggleLike(commentId);
      
      // Update like count in the store
      set((state) => {
        const updateLikes = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                likes: result.likesCount,
              };
            } else if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateLikes(comment.replies),
              };
            }
            return comment;
          });
        };
        
        return {
          comments: {
            ...state.comments,
            [postId]: updateLikes(state.comments[postId] || []),
          },
        };
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to like comment',
      });
      throw error;
    }
  },

  reportComment: async (commentId: string, reason: string) => {
    try {
      await commentsAPI.reportComment(commentId, reason);
      // Optionally show a success message
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to report comment',
      });
      throw error;
    }
  },

  clearComments: (postId?: string) => {
    if (postId) {
      set((state) => {
        const { [postId]: _, ...rest } = state.comments;
        return { comments: rest };
      });
    } else {
      set({ comments: {}, currentPage: {}, hasMore: {} });
    }
  },

  // Optimistic update helpers
  addOptimisticComment: (postId: string, comment: Comment) => {
    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: [comment, ...(state.comments[postId] || [])],
      },
    }));
  },

  updateOptimisticComment: (commentId: string, postId: string, updates: Partial<Comment>) => {
    set((state) => {
      const updateComment = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment._id === commentId) {
            return { ...comment, ...updates };
          } else if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateComment(comment.replies),
            };
          }
          return comment;
        });
      };
      
      return {
        comments: {
          ...state.comments,
          [postId]: updateComment(state.comments[postId] || []),
        },
      };
    });
  },

  removeOptimisticComment: (commentId: string, postId: string) => {
    set((state) => {
      const removeComment = (comments: Comment[]): Comment[] => {
        return comments.filter(comment => {
          if (comment._id === commentId) {
            return false;
          }
          if (comment.replies && comment.replies.length > 0) {
            comment.replies = removeComment(comment.replies);
          }
          return true;
        });
      };
      
      return {
        comments: {
          ...state.comments,
          [postId]: removeComment(state.comments[postId] || []),
        },
      };
    });
  },
}));