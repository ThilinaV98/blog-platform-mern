'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { uploadAPI, UploadedImage, UploadProgress } from '@/lib/api/upload';

interface ImageUploadProps {
  onUpload: (image: UploadedImage) => void;
  onError?: (error: string) => void;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  onUpload,
  onError,
  multiple = false,
  maxFiles = 10,
  className = '',
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  }, []);

  const handleFiles = async (files: File[]) => {
    setError(null);
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      const errorMsg = 'Please select image files only';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate files
    if (!multiple && imageFiles.length > 1) {
      const errorMsg = 'Only one file allowed';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (imageFiles.length > maxFiles) {
      const errorMsg = `Maximum ${maxFiles} files allowed`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate each file
    const validation = multiple 
      ? uploadAPI.validateFiles(imageFiles)
      : uploadAPI.validateFile(imageFiles[0]);

    if (!validation.valid) {
      setError(validation.error!);
      onError?.(validation.error!);
      return;
    }

    // Create previews
    const newPreviews = await Promise.all(
      imageFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    setPreview(newPreviews);

    // Upload files
    setUploading(true);
    setProgress({ loaded: 0, total: 100, percentage: 0 });

    try {
      if (multiple && imageFiles.length > 1) {
        const results = await uploadAPI.uploadImages(imageFiles, (prog) => {
          setProgress(prog);
        });
        results.forEach(result => onUpload(result));
      } else {
        const result = await uploadAPI.uploadImage(imageFiles[0], (prog) => {
          setProgress(prog);
        });
        onUpload(result);
      }
      
      // Clear preview after successful upload
      setTimeout(() => {
        setPreview([]);
        setProgress(null);
      }, 1000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const clearPreview = (index: number) => {
    setPreview(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer
          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {preview.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {preview.map((src, index) => (
              <div key={index} className="relative group">
                <img
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                {!uploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearPreview(index);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {uploading && progress && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="text-white text-sm font-medium">
                      {progress.percentage}%
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {uploading ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              ) : (
                <div className="p-3 bg-gray-100 rounded-full">
                  <Upload className="w-6 h-6 text-gray-600" />
                </div>
              )}
            </div>
            
            <p className="text-sm font-medium text-gray-900">
              {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {multiple ? `Up to ${maxFiles} images` : 'Single image'} (max 5MB each)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPEG, PNG, GIF, WebP supported
            </p>
          </div>
        )}

        {progress && uploading && (
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-600 h-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1 text-center">
              {progress.percentage}% uploaded
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}