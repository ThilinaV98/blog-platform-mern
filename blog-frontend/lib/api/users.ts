import apiClient from './client';

export interface UserProfile {
  _id: string;
  email: string;
  username: string;
  profile: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    website?: string;
    location?: string;
    socialLinks?: {
      twitter?: string;
      github?: string;
      linkedin?: string;
    };
  };
  role: string;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}

export interface UserPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  metadata: {
    views: number;
    likes: number;
    comments: number;
    readTime: number;
  };
}

export interface UserPostsResponse {
  posts: UserPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

class UsersAPI {
  // Get current user profile
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/api/users/profile');
    return response.data;
  }

  // Update current user profile
  async updateProfile(data: UpdateProfileDto): Promise<UserProfile> {
    const response = await apiClient.patch('/api/users/profile', data);
    return response.data;
  }

  // Get public user profile by username
  async getPublicProfile(username: string): Promise<UserProfile> {
    const response = await apiClient.get(`/api/users/${username}`);
    return response.data;
  }

  // Get user's posts
  async getUserPosts(username: string, page = 1, limit = 10): Promise<UserPostsResponse> {
    const response = await apiClient.get(`/api/users/${username}/posts`, {
      params: { page, limit },
    });
    return response.data;
  }

  // Upload avatar
  async uploadAvatar(file: File): Promise<{ message: string; avatarUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.patch('/api/users/password', {
      currentPassword,
      newPassword,
    });
  }

  // Delete user account
  async deleteAccount(password: string): Promise<void> {
    await apiClient.delete('/api/users/account', {
      data: { password },
    });
  }
}

export const usersAPI = new UsersAPI();