'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usersAPI } from '@/lib/api/users';

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Change Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Delete Account State
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await usersAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      // Show success message briefly before logout
      setMessage({ type: 'success', text: 'Password updated successfully! You will be logged out for security.' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Wait 2 seconds to show the success message, then logout and redirect
      setTimeout(async () => {
        await logout();
        router.push('/login?message=Password changed successfully. Please login with your new password.');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to change password';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Please enter your password to confirm' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await usersAPI.deleteAccount(deletePassword);
      
      await logout();
      router.push('/register');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to delete account';
      setMessage({ type: 'error', text: errorMessage });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account security and preferences</p>
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

      <div className="space-y-8">
        {/* Account Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
            <p className="text-sm text-gray-600">Your account details and status</p>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Account Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{user?.role}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
                <dd className="mt-1">
                  {user?.emailVerified ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
          </div>
          <div className="px-6 py-4">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-white shadow rounded-lg border border-red-200">
          <div className="px-6 py-4 border-b border-red-200">
            <h2 className="text-lg font-semibold text-red-900">Delete Account</h2>
            <p className="text-sm text-red-600">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <div className="px-6 py-4">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex justify-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Are you absolutely sure?
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          This will permanently delete your account, profile, posts, and all associated data.
                          You will not be able to recover this information.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700">
                    Enter your password to confirm deletion
                  </label>
                  <input
                    type="password"
                    id="deletePassword"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading || !deletePassword}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Deleting...' : 'Delete Account'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}