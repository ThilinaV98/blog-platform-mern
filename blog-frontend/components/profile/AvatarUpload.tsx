'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface AvatarUploadProps {
  currentAvatar?: string;
  username?: string;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
}

export default function AvatarUpload({ 
  currentAvatar, 
  username = 'User', 
  onUpload, 
  disabled 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    
    try {
      const avatarUrl = await onUpload(file);
      setPreview(null);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to upload avatar. Please try again.';
      setError(errorMessage);
      console.error('Upload error:', err);
      setPreview(null); // Clear preview on error
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const getAvatarUrl = () => {
    if (preview) return preview;
    if (currentAvatar) {
      // If it's a relative path, prepend the API URL
      if (currentAvatar.startsWith('/')) {
        return `${process.env.NEXT_PUBLIC_API_URL}${currentAvatar}`;
      }
      return currentAvatar;
    }
    // Default avatar with initials
    return null;
  };

  const getInitials = () => {
    return username.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Current Avatar Display */}
      <div className="flex justify-center">
        <div className="relative">
          {getAvatarUrl() ? (
            <div className="relative w-32 h-32 rounded-full overflow-hidden">
              <Image
                src={getAvatarUrl()!}
                alt={username}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-4xl font-semibold text-primary-600">
                {getInitials()}
              </span>
            </div>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleChange}
          disabled={disabled || uploading}
        />
        
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        <p className="mt-2 text-sm text-gray-600">
          {dragActive ? (
            'Drop the image here'
          ) : (
            <>
              <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PNG, JPG, GIF or WebP up to 5MB
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 text-center">
          {error}
        </div>
      )}
    </div>
  );
}