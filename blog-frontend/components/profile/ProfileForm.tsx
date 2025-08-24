'use client';

import { useState, useEffect } from 'react';
import { UpdateProfileDto } from '@/lib/api/users';

interface ProfileFormProps {
  initialData: UpdateProfileDto;
  onSubmit: (data: UpdateProfileDto) => Promise<void>;
  loading?: boolean;
}

// Helper function to extract username from social media URL
const extractUsername = (url: string | null | undefined, platform: string): string => {
  if (!url) return '';
  
  // If it's already just a username, return it
  if (!url.includes('://')) {
    return url;
  }
  
  // Extract username from full URL
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
    
    if (platform === 'linkedin') {
      // LinkedIn URLs are like /in/username
      return pathname.replace('in/', '');
    }
    
    // For Twitter and GitHub, just return the pathname
    return pathname;
  } catch {
    return url;
  }
};

// Helper function to construct full URL from username
const constructUrl = (username: string | null | undefined, platform: string): string | null => {
  if (!username || username.trim() === '') {
    return null;
  }
  
  // If it's already a full URL, return it
  if (username.includes('://')) {
    return username;
  }
  
  // Construct the full URL based on platform
  const trimmedUsername = username.trim();
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/${trimmedUsername}`;
    case 'github':
      return `https://github.com/${trimmedUsername}`;
    case 'linkedin':
      return `https://linkedin.com/in/${trimmedUsername}`;
    default:
      return trimmedUsername;
  }
};

export default function ProfileForm({ initialData, onSubmit, loading }: ProfileFormProps) {
  // Initialize form data with extracted usernames
  const [formData, setFormData] = useState<UpdateProfileDto>({
    ...initialData,
    socialLinks: {
      twitter: extractUsername(initialData.socialLinks?.twitter, 'twitter'),
      github: extractUsername(initialData.socialLinks?.github, 'github'),
      linkedin: extractUsername(initialData.socialLinks?.linkedin, 'linkedin'),
    } as any,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('socialLinks.')) {
      const socialKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialKey]: value,
        },
      }));
    } else if (name === 'website') {
      // Handle website field specially - prepend https:// if not present
      const websiteValue = value ? (value.startsWith('http') ? value : `https://${value}`) : '';
      setFormData(prev => ({
        ...prev,
        [name]: websiteValue,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct full URLs for social links before submitting
    const dataToSubmit: UpdateProfileDto = {
      ...formData,
      socialLinks: {
        twitter: constructUrl(formData.socialLinks?.twitter, 'twitter'),
        github: constructUrl(formData.socialLinks?.github, 'github'),
        linkedin: constructUrl(formData.socialLinks?.linkedin, 'linkedin'),
      } as any,
    };
    
    await onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h3>
        
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Display Name
            </div>
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName || ''}
            onChange={handleChange}
            className="block w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors"
            placeholder="John Doe"
            disabled={loading}
            maxLength={50}
          />
          <p className="mt-1 text-xs text-gray-500">This is how your name will appear across the platform</p>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Bio
            </div>
          </label>
          <div className="relative">
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={formData.bio || ''}
              onChange={handleChange}
              className="block w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors resize-none"
              placeholder="Tell us about yourself, your interests, and what you write about..."
              disabled={loading}
              maxLength={500}
            />
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
              {formData.bio?.length || 0}/500
            </div>
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Website
            </div>
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              https://
            </span>
            <input
              type="text"
              id="website"
              name="website"
              value={formData.website?.replace(/^https?:\/\//, '') || ''}
              onChange={(e) => handleChange({ ...e, target: { ...e.target, value: e.target.value, name: 'website' } } as any)}
              className="flex-1 block w-full px-3 py-2 border-0 focus:ring-0 sm:text-sm"
              placeholder="example.com"
              disabled={loading}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location
            </div>
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location || ''}
            onChange={handleChange}
            className="block w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors"
            placeholder="San Francisco, CA"
            disabled={loading}
            maxLength={100}
          />
          <p className="mt-1 text-xs text-gray-500">Share your city and country to connect with local readers</p>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Social Links</h3>
        
        {/* Twitter */}
        <div>
          <label htmlFor="socialLinks.twitter" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              Twitter
            </div>
          </label>
          <div className="mt-1 flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
              twitter.com/
            </span>
            <input
              type="text"
              id="socialLinks.twitter"
              name="socialLinks.twitter"
              value={formData.socialLinks?.twitter || ''}
              onChange={handleChange}
              className="flex-1 block w-full px-3 py-2 border-0 focus:ring-0 sm:text-sm"
              placeholder="username"
              disabled={loading}
            />
          </div>
        </div>

        {/* GitHub */}
        <div>
          <label htmlFor="socialLinks.github" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </div>
          </label>
          <div className="mt-1 flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
              github.com/
            </span>
            <input
              type="text"
              id="socialLinks.github"
              name="socialLinks.github"
              value={formData.socialLinks?.github || ''}
              onChange={handleChange}
              className="flex-1 block w-full px-3 py-2 border-0 focus:ring-0 sm:text-sm"
              placeholder="username"
              disabled={loading}
            />
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <label htmlFor="socialLinks.linkedin" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </div>
          </label>
          <div className="mt-1 flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
              linkedin.com/in/
            </span>
            <input
              type="text"
              id="socialLinks.linkedin"
              name="socialLinks.linkedin"
              value={formData.socialLinks?.linkedin || ''}
              onChange={handleChange}
              className="flex-1 block w-full px-3 py-2 border-0 focus:ring-0 sm:text-sm"
              placeholder="username"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          }`}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}