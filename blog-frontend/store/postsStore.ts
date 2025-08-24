import { create } from 'zustand';
import { postsAPI, Post, CreatePostDto, UpdatePostDto, PostQueryParams, PostsResponse } from '@/lib/api/posts';

interface PostsStore {
  // State
  posts: Post[];
  currentPost: Post | null;
  totalPosts: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  isLoading: boolean;
  error: string | null;

  // Draft management
  draft: Partial<CreatePostDto> | null;
  lastSaved: Date | null;
  isDirty: boolean;

  // Actions
  fetchPosts: (params?: PostQueryParams) => Promise<void>;
  fetchMyPosts: (params?: PostQueryParams) => Promise<void>;
  fetchPost: (slug: string) => Promise<void>;
  createPost: (data: CreatePostDto) => Promise<Post>;
  updatePost: (id: string, data: UpdatePostDto) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  publishPost: (id: string) => Promise<void>;
  archivePost: (id: string) => Promise<void>;
  unarchivePost: (id: string) => Promise<void>;
  
  // Draft actions
  saveDraft: (data: Partial<CreatePostDto>) => void;
  clearDraft: () => void;
  setDirty: (dirty: boolean) => void;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  posts: [],
  currentPost: null,
  totalPosts: 0,
  currentPage: 1,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
  isLoading: false,
  error: null,
  draft: null,
  lastSaved: null,
  isDirty: false,
};

export const usePostsStore = create<PostsStore>((set, get) => ({
  ...initialState,

  fetchPosts: async (params?: PostQueryParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await postsAPI.getAll(params);
      set({
        posts: response.posts,
        totalPosts: response.meta.total,
        currentPage: response.meta.page,
        totalPages: response.meta.totalPages,
        hasNext: response.meta.hasNext,
        hasPrev: response.meta.hasPrev,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to fetch posts',
        isLoading: false,
      });
    }
  },

  fetchMyPosts: async (params?: PostQueryParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await postsAPI.getMyPosts(params);
      set({
        posts: response.posts,
        totalPosts: response.meta.total,
        currentPage: response.meta.page,
        totalPages: response.meta.totalPages,
        hasNext: response.meta.hasNext,
        hasPrev: response.meta.hasPrev,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to fetch your posts',
        isLoading: false,
      });
    }
  },

  fetchPost: async (slug: string) => {
    set({ isLoading: true, error: null });
    try {
      const post = await postsAPI.getBySlug(slug);
      set({
        currentPost: post,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to fetch post',
        isLoading: false,
      });
    }
  },

  createPost: async (data: CreatePostDto) => {
    set({ isLoading: true, error: null });
    try {
      const post = await postsAPI.create(data);
      set((state) => ({
        posts: [post, ...state.posts],
        isLoading: false,
        draft: null,
        isDirty: false,
      }));
      return post;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to create post',
        isLoading: false,
      });
      throw error;
    }
  },

  updatePost: async (id: string, data: UpdatePostDto) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPost = await postsAPI.update(id, data);
      set((state) => ({
        posts: state.posts.map((post) =>
          post._id === id ? updatedPost : post
        ),
        currentPost: state.currentPost?._id === id ? updatedPost : state.currentPost,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to update post',
        isLoading: false,
      });
      throw error;
    }
  },

  deletePost: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await postsAPI.delete(id);
      set((state) => ({
        posts: state.posts.filter((post) => post._id !== id),
        currentPost: state.currentPost?._id === id ? null : state.currentPost,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to delete post',
        isLoading: false,
      });
      throw error;
    }
  },

  publishPost: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const publishedPost = await postsAPI.publish(id);
      set((state) => ({
        posts: state.posts.map((post) =>
          post._id === id ? publishedPost : post
        ),
        currentPost: state.currentPost?._id === id ? publishedPost : state.currentPost,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to publish post',
        isLoading: false,
      });
      throw error;
    }
  },

  archivePost: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const archivedPost = await postsAPI.archive(id);
      set((state) => ({
        posts: state.posts.map((post) =>
          post._id === id ? archivedPost : post
        ),
        currentPost: state.currentPost?._id === id ? archivedPost : state.currentPost,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to archive post',
        isLoading: false,
      });
      throw error;
    }
  },

  unarchivePost: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const unarchivedPost = await postsAPI.unarchive(id);
      set((state) => ({
        posts: state.posts.map((post) =>
          post._id === id ? unarchivedPost : post
        ),
        currentPost: state.currentPost?._id === id ? unarchivedPost : state.currentPost,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to unarchive post',
        isLoading: false,
      });
      throw error;
    }
  },

  saveDraft: (data: Partial<CreatePostDto>) => {
    set({
      draft: data,
      lastSaved: new Date(),
      isDirty: false,
    });
    // Save to localStorage as well
    if (typeof window !== 'undefined') {
      localStorage.setItem('postDraft', JSON.stringify(data));
      localStorage.setItem('postDraftSavedAt', new Date().toISOString());
    }
  },

  clearDraft: () => {
    set({
      draft: null,
      lastSaved: null,
      isDirty: false,
    });
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('postDraft');
      localStorage.removeItem('postDraftSavedAt');
    }
  },

  setDirty: (dirty: boolean) => {
    set({ isDirty: dirty });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));