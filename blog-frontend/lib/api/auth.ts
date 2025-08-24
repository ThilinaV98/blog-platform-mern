import apiClient from './client';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface LoginDto {
  emailOrUsername: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: string;
  emailVerified?: boolean;
  profile?: {
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
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/login', data);
    return response.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/api/auth/logout', { refreshToken });
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    // Use plain axios to avoid interceptor loop
    const response = await axios.post(`${API_URL}/api/auth/refresh`, { 
      refreshToken 
    }, {
      withCredentials: true
    });
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get('/api/users/profile');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.patch('/api/users/profile', data);
    return response.data;
  },
};