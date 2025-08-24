'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usersAPI, UpdateProfileDto } from '@/lib/api/users';
import ProfileForm from '@/components/profile/ProfileForm';
import AvatarUpload from '@/components/profile/AvatarUpload';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await usersAPI.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    }
  };

  const handleProfileUpdate = async (data: UpdateProfileDto) => {
    setLoading(true);
    setMessage(null);
    try {
      const updatedProfile = await usersAPI.updateProfile(data);
      setProfile(updatedProfile);
      await refreshUser();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await usersAPI.uploadAvatar(file);
      await fetchProfile();
      await refreshUser();
      setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
      return result.avatarUrl;
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload avatar';
      setMessage({ type: 'error', text: errorMessage });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">Update your profile information and avatar</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar Section */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
            <AvatarUpload
              currentAvatar={profile?.profile?.avatar}
              username={profile?.username}
              onUpload={handleAvatarUpload}
              disabled={loading}
            />
          </div>
        </div>

        {/* Profile Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
            <ProfileForm
              initialData={{
                displayName: profile?.profile?.displayName || '',
                bio: profile?.profile?.bio || '',
                website: profile?.profile?.website || '',
                location: profile?.profile?.location || '',
                socialLinks: {
                  twitter: profile?.profile?.socialLinks?.twitter || '',
                  github: profile?.profile?.socialLinks?.github || '',
                  linkedin: profile?.profile?.socialLinks?.linkedin || '',
                },
              }}
              onSubmit={handleProfileUpdate}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}