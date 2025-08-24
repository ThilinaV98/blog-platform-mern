import api from './client';

export interface UploadedImage {
  url: string;
  key: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const uploadAPI = {
  /**
   * Upload a single image for blog posts
   */
  async uploadImage(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedImage> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<UploadedImage>('/api/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });

    return data;
  },

  /**
   * Upload multiple images for blog posts
   */
  async uploadImages(
    files: File[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedImage[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const { data } = await api.post<UploadedImage[]>('/api/uploads/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });

    return data;
  },

  /**
   * Delete an uploaded image
   */
  async deleteImage(key: string): Promise<{ message: string }> {
    const [yearMonth, filename] = key.split('/');
    const { data } = await api.delete<{ message: string }>(
      `/api/uploads/image/${encodeURIComponent(yearMonth)}/${encodeURIComponent(filename)}`
    );
    return data;
  },

  /**
   * Load all uploaded images
   */
  async loadImages(): Promise<UploadedImage[]> {
    const { data } = await api.get<UploadedImage[]>('/api/uploads/images');
    return data;
  },

  /**
   * Get image URL with specific size
   */
  getImageUrl(key: string, size: 'original' | 'large' | 'medium' | 'thumbnail' = 'original'): string {
    if (!key) return '';
    
    const [yearMonth, filenameBase] = key.split('/');
    const sizeStr = size === 'original' ? 'original' : size;
    const filename = `${filenameBase}-${sizeStr}.webp`;
    
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/uploads/posts/${yearMonth}/${filename}`;
  },

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' };
    }

    return { valid: true };
  },

  /**
   * Validate multiple files
   */
  validateFiles(files: File[]): { valid: boolean; error?: string } {
    if (files.length === 0) {
      return { valid: false, error: 'No files selected' };
    }

    if (files.length > 10) {
      return { valid: false, error: 'Maximum 10 files allowed' };
    }

    for (const file of files) {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return validation;
      }
    }

    return { valid: true };
  },
};