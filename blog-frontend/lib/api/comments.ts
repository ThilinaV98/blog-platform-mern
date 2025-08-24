import apiClient from './client';

export interface CommentAuthor {
  _id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

export interface Comment {
  _id: string;
  postId: string;
  userId: CommentAuthor | string;
  content: string;
  path: string;
  depth: number;
  parentId?: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  likes: number;
  reports: number;
  isVisible: boolean;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  repliesCount?: number;
  hasReplies?: boolean;
}

export interface CreateCommentDto {
  content: string;
  parentId?: string;
}

export interface UpdateCommentDto {
  content: string;
}

export interface CommentQueryParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'popular';
  includeDeleted?: boolean;
}

export interface CommentsResponse {
  comments: Comment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CommentReport {
  _id: string;
  commentId: {
    _id: string;
    content: string;
    userId: {
      _id: string;
      username: string;
      profile?: {
        displayName?: string;
      };
    };
    postId: {
      _id: string;
      title: string;
      slug: string;
    };
  };
  reporterId: {
    _id: string;
    username: string;
  };
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

class CommentsAPI {
  /**
   * Get comments for a post
   */
  async getPostComments(
    postId: string,
    params: CommentQueryParams = {}
  ): Promise<CommentsResponse> {
    const { data } = await apiClient.get(`/api/posts/${postId}/comments`, {
      params,
    });
    return {
      comments: data.data,
      meta: data.meta,
    };
  }

  /**
   * Get a single comment with replies
   */
  async getComment(commentId: string): Promise<Comment> {
    const { data } = await apiClient.get(`/api/comments/${commentId}`);
    return data.data;
  }

  /**
   * Create a new comment
   */
  async createComment(
    postId: string,
    createDto: CreateCommentDto
  ): Promise<Comment> {
    const { data } = await apiClient.post(
      `/api/posts/${postId}/comments`,
      createDto
    );
    return data.data;
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    updateDto: UpdateCommentDto
  ): Promise<Comment> {
    const { data } = await apiClient.patch(
      `/api/comments/${commentId}`,
      updateDto
    );
    return data.data;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/api/comments/${commentId}`);
    return data;
  }

  /**
   * Delete a comment as admin (Admin only)
   */
  async deleteCommentAsAdmin(commentId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/api/admin/comments/${commentId}`);
    return data;
  }

  /**
   * Like or unlike a comment
   */
  async toggleLike(commentId: string): Promise<{
    liked: boolean;
    likesCount: number;
  }> {
    const { data } = await apiClient.post(`/api/comments/${commentId}/like`);
    return data.data;
  }

  /**
   * Report a comment
   */
  async reportComment(
    commentId: string,
    reason: string
  ): Promise<{ message: string }> {
    const { data } = await apiClient.post(
      `/api/comments/${commentId}/report`,
      { reason }
    );
    return data;
  }

  /**
   * Get user's comments
   */
  async getUserComments(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<CommentsResponse> {
    const { data } = await apiClient.get(`/api/users/${userId}/comments`, {
      params: { page, limit },
    });
    return {
      comments: data.data,
      meta: data.meta,
    };
  }

  // Admin endpoints
  /**
   * Get reported comments (Admin only)
   */
  async getReports(page: number = 1, limit: number = 20): Promise<{
    data: CommentReport[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiClient.get(`/api/admin/reports?page=${page}&limit=${limit}`);
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  }

  /**
   * Dismiss a report (Admin only)
   */
  async dismissReport(reportId: string): Promise<void> {
    await apiClient.patch(`/api/admin/reports/${reportId}/dismiss`);
  }
}

export const commentsAPI = new CommentsAPI();