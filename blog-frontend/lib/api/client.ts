import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Don't try to refresh if the failed request was already a refresh attempt
    const isRefreshRequest = originalRequest.url?.includes('/api/auth/refresh');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = authStore.getState().refreshToken;
        if (!refreshToken) {
          authStore.getState().logout();
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken, refreshToken: newRefreshToken, user } = response.data;
        
        authStore.getState().setTokens(accessToken, newRefreshToken);
        authStore.getState().setUser(user);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Clear auth state and redirect to login
        authStore.getState().clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;