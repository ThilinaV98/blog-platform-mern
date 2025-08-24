import apiClient from './client';

export interface LikeStatus {
  liked: boolean;
  likesCount: number;
}

export interface LikeUser {
  _id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

export interface Like {
  _id: string;
  userId: LikeUser;
  targetId: string;
  targetType: 'post' | 'comment';
  createdAt: string;
}

export interface LikesResponse {
  likes: Like[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface LikesQueryParams {
  page?: number;
  limit?: number;
}

class LikesAPI {
  // Post Like Methods
  async likePost(postId: string): Promise<LikeStatus> {
    const { data } = await apiClient.post(`/api/posts/${postId}/like`);
    return data;
  }

  async unlikePost(postId: string): Promise<LikeStatus> {
    const { data } = await apiClient.delete(`/api/posts/${postId}/like`);
    return data;
  }

  async getPostLikes(postId: string, params?: LikesQueryParams): Promise<LikesResponse> {
    const { data } = await apiClient.get(`/api/posts/${postId}/likes`, { params });
    return data;
  }

  // Comment Like Methods
  async likeComment(commentId: string): Promise<LikeStatus> {
    const { data } = await apiClient.post(`/api/comments/${commentId}/like`);
    return data;
  }

  async unlikeComment(commentId: string): Promise<LikeStatus> {
    const { data } = await apiClient.delete(`/api/comments/${commentId}/like`);
    return data;
  }

  async getCommentLikes(commentId: string, params?: LikesQueryParams): Promise<LikesResponse> {
    const { data } = await apiClient.get(`/api/comments/${commentId}/likes`, { params });
    return data;
  }

  // User Likes
  async getUserLikes(params?: LikesQueryParams): Promise<LikesResponse> {
    const { data } = await apiClient.get('/api/user/likes', { params });
    return data;
  }

  // Generic methods for the LikeButton component
  async like(targetId: string, targetType: 'post' | 'comment'): Promise<LikeStatus> {
    if (targetType === 'post') {
      return this.likePost(targetId);
    } else {
      return this.likeComment(targetId);
    }
  }

  async unlike(targetId: string, targetType: 'post' | 'comment'): Promise<LikeStatus> {
    if (targetType === 'post') {
      return this.unlikePost(targetId);
    } else {
      return this.unlikeComment(targetId);
    }
  }

  async getLikes(targetId: string, targetType: 'post' | 'comment', params?: LikesQueryParams): Promise<LikesResponse> {
    if (targetType === 'post') {
      return this.getPostLikes(targetId, params);
    } else {
      return this.getCommentLikes(targetId, params);
    }
  }
}

export const likesAPI = new LikesAPI();