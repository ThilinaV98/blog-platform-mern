import { useEffect } from 'react';
import { authStore } from '@/store/authStore';
import { usersAPI } from '@/lib/api/users';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    setUser,
  } = authStore();

  // Removed checkAuth from here - it's already handled by AuthProvider

  const refreshUser = async () => {
    try {
      const userData = await usersAPI.getProfile();
      // Map UserProfile to User interface
      const user = {
        id: userData._id,
        email: userData.email,
        username: userData.username,
        displayName: userData.profile?.displayName,
        avatar: userData.profile?.avatar,
        role: userData.role,
        emailVerified: userData.emailVerified,
        profile: userData.profile,
      };
      setUser(user);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
  };
}