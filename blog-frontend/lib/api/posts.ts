import apiClient from './client';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface PostAuthor {
  _id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

export interface PostMetadata {
  readTime: number;
  wordCount: number;
  views: number;
  uniqueViews: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PostSeo {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
}

export interface Post {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  author: PostAuthor | string;
  tags: string[];
  category?: string;
  status: PostStatus;
  publishedAt?: string;
  scheduledAt?: string;
  featured: boolean;
  metadata: PostMetadata;
  seo?: PostSeo;
  url?: string;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  tags?: string[];
  category?: string;
  status?: PostStatus;
  scheduledAt?: string;
  featured?: boolean;
  seo?: PostSeo;
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

export interface PostsResponse {
  posts: Post[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PostQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PostStatus;
  category?: string;
  tags?: string[];
  author?: string;
  sortBy?: 'createdAt' | 'publishedAt' | 'title' | 'metadata.views' | 'metadata.likes';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
}

class PostsAPI {
  // Create a new post
  async create(data: CreatePostDto): Promise<Post> {
    const response = await apiClient.post('/api/posts', data);
    return response.data;
  }

  // Get all published posts
  async getAll(params?: PostQueryParams): Promise<PostsResponse> {
    const response = await apiClient.get('/api/posts', { params });
    return response.data;
  }

  // Get user's posts (including drafts)
  async getMyPosts(params?: PostQueryParams): Promise<PostsResponse> {
    const response = await apiClient.get('/api/posts/my-posts', { params });
    return response.data;
  }

  // Get user's draft posts
  async getDrafts(params?: PostQueryParams): Promise<PostsResponse> {
    const response = await apiClient.get('/api/posts/drafts', { params });
    return response.data;
  }

  // Get trending posts
  async getTrending(limit = 5): Promise<Post[]> {
    const response = await apiClient.get('/api/posts/trending', { 
      params: { limit } 
    });
    return response.data;
  }

  // Get all categories
  async getCategories(): Promise<{ category: string; count: number }[]> {
    const response = await apiClient.get('/api/posts/categories');
    return response.data;
  }

  // Get all tags
  async getTags(): Promise<{ tag: string; count: number }[]> {
    const response = await apiClient.get('/api/posts/tags');
    return response.data;
  }

  // Get single post by slug
  async getBySlug(slug: string): Promise<Post> {
    const response = await apiClient.get(`/api/posts/${slug}`);
    return response.data;
  }

  // Get single post by ID  
  async getById(id: string): Promise<Post> {
    // Use the dedicated by-id endpoint to avoid conflicts with slug
    const response = await apiClient.get(`/api/posts/by-id/${id}`);
    return response.data;
  }

  // Get related posts
  async getRelated(id: string, limit = 4): Promise<Post[]> {
    const response = await apiClient.get(`/api/posts/${id}/related`, {
      params: { limit }
    });
    return response.data;
  }

  // Update a post
  async update(id: string, data: UpdatePostDto): Promise<Post> {
    const response = await apiClient.patch(`/api/posts/${id}`, data);
    return response.data;
  }

  // Delete a post
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/posts/${id}`);
  }

  // Publish a draft post
  async publish(id: string): Promise<Post> {
    const response = await apiClient.post(`/api/posts/${id}/publish`);
    return response.data;
  }

  // Archive a post
  async archive(id: string): Promise<Post> {
    const response = await apiClient.post(`/api/posts/${id}/archive`);
    return response.data;
  }

  // Unarchive a post
  async unarchive(id: string): Promise<Post> {
    const response = await apiClient.post(`/api/posts/${id}/unarchive`);
    return response.data;
  }

  // Get user statistics
  async getMyStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    archivedPosts: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    recentPosts: Post[];
  }> {
    const response = await apiClient.get('/api/posts/my-stats');
    return response.data;
  }
}

export const postsAPI = new PostsAPI();