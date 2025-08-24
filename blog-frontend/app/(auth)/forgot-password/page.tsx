'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiClient.post('/api/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a password reset link to {email}
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
      <div className="mb-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          Forgot your password?
        </h2>
        <p className="text-center text-sm text-gray-600 mt-2">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}