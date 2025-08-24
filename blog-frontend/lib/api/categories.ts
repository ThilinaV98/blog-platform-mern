import apiClient from './client';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  isActive: boolean;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export const categoriesAPI = {
  /**
   * Get all categories
   */
  async getAll(activeOnly = true): Promise<Category[]> {
    const response = await apiClient.get(`/categories?activeOnly=${activeOnly}`);
    return response.data;
  },

  /**
   * Get categories with post counts
   */
  async getCategoriesWithCounts(): Promise<{ category: Category; count: number }[]> {
    const response = await apiClient.get('/categories/with-counts');
    return response.data;
  },

  /**
   * Get category by slug
   */
  async getBySlug(slug: string): Promise<Category> {
    const response = await apiClient.get(`/categories/slug/${slug}`);
    return response.data;
  },

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<Category> {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  /**
   * Create category (admin only)
   */
  async create(data: Partial<Category>): Promise<Category> {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  /**
   * Update category (admin only)
   */
  async update(id: string, data: Partial<Category>): Promise<Category> {
    const response = await apiClient.patch(`/categories/${id}`, data);
    return response.data;
  },

  /**
   * Delete category (admin only)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  }
};