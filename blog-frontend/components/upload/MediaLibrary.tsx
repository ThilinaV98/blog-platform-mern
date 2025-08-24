'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Trash2, 
  Copy, 
  Check, 
  Search,
  Grid,
  List,
  Upload
} from 'lucide-react';
import { uploadAPI, UploadedImage } from '@/lib/api/upload';
import { ImageUpload } from './ImageUpload';

interface MediaLibraryProps {
  onSelect?: (image: UploadedImage) => void;
  onClose?: () => void;
  multiple?: boolean;
  images?: UploadedImage[];
  onImagesChange?: (images: UploadedImage[]) => void;
  embedded?: boolean; // If true, renders without modal wrapper
}

export function MediaLibrary({
  onSelect,
  onClose,
  multiple = false,
  images: initialImages = [],
  onImagesChange,
  embedded = false,
}: MediaLibraryProps) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load images on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedImages = await uploadAPI.loadImages();
        // Merge with any initial images (avoiding duplicates)
        const allImages = [...loadedImages];
        
        // Add any initial images that aren't already in the loaded images
        for (const initialImage of initialImages) {
          if (!allImages.some(img => img.key === initialImage.key)) {
            allImages.unshift(initialImage); // Add to beginning (newest first)
          }
        }
        
        setImages(allImages);
        onImagesChange?.(allImages);
      } catch (err) {
        setError('Failed to load images');
        // Fall back to initial images if loading fails
        setImages(initialImages);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, []); // Only run on mount

  // Update images when initialImages changes
  useEffect(() => {
    // If we haven't loaded images yet, or if there are no loaded images,
    // just use the initial images
    if (loading || images.length === 0) {
      setImages(initialImages);
    }
  }, [initialImages, loading, images.length]);

  const handleImageUpload = (image: UploadedImage) => {
    const newImages = [image, ...images];
    setImages(newImages);
    onImagesChange?.(newImages);
    setActiveTab('library');
  };

  const handleImageSelect = (image: UploadedImage) => {
    if (multiple) {
      const newSelected = new Set(selectedImages);
      if (newSelected.has(image.key)) {
        newSelected.delete(image.key);
      } else {
        newSelected.add(image.key);
      }
      setSelectedImages(newSelected);
    } else {
      onSelect?.(image);
      if (!embedded) {
        onClose?.();
      }
    }
  };

  const handleDeleteImage = async (image: UploadedImage) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    setDeleting(image.key);
    try {
      await uploadAPI.deleteImage(image.key);
      const newImages = images.filter(img => img.key !== image.key);
      setImages(newImages);
      onImagesChange?.(newImages);
      selectedImages.delete(image.key);
      setSelectedImages(new Set(selectedImages));
    } catch (error) {
      alert('Failed to delete image');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      // Silent failure for clipboard operation
    }
  };

  const handleSelectMultiple = () => {
    const selected = Array.from(selectedImages).map(key => 
      images.find(img => img.key === key)!
    );
    selected.forEach(img => onSelect?.(img));
    if (!embedded) {
      onClose?.();
    }
  };

  const filteredImages = images.filter(image => 
    searchQuery === '' || 
    image.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    image.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Media Library</h2>
        {!embedded && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'library'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Library ({images.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'upload'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upload New
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div className="flex-1 p-6">
          <ImageUpload
            onUpload={handleImageUpload}
            multiple={true}
            maxFiles={10}
            className="max-w-2xl mx-auto"
          />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${
                  viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-medium">Loading images...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500">
                <ImageIcon className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Failed to load images</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ImageIcon className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">No images found</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'No images match your search' : 'Upload some images to get started'}
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Images
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredImages.map((image) => (
                  <div
                    key={image.key}
                    className={`
                      relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                      ${selectedImages.has(image.key) 
                        ? 'border-primary-500 shadow-lg' 
                        : 'border-transparent hover:border-gray-300'
                      }
                    `}
                    onClick={() => handleImageSelect(image)}
                  >
                    <img
                      src={uploadAPI.getImageUrl(image.key, 'thumbnail')}
                      alt=""
                      className="w-full h-32 object-cover"
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl(image.url);
                          }}
                          className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy URL"
                        >
                          {copiedUrl === image.url ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(image);
                          }}
                          disabled={deleting === image.key}
                          className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === image.key ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {selectedImages.has(image.key) && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredImages.map((image) => (
                  <div
                    key={image.key}
                    className={`
                      flex items-center p-3 rounded-lg cursor-pointer transition-all
                      ${selectedImages.has(image.key)
                        ? 'bg-primary-50 border border-primary-300'
                        : 'hover:bg-gray-50 border border-transparent'
                      }
                    `}
                    onClick={() => handleImageSelect(image)}
                  >
                    <img
                      src={uploadAPI.getImageUrl(image.key, 'thumbnail')}
                      alt=""
                      className="w-16 h-16 object-cover rounded"
                    />
                    
                    <div className="flex-1 ml-4">
                      <p className="text-sm font-medium truncate">{image.key}</p>
                      <p className="text-xs text-gray-500">
                        {image.dimensions.width} × {image.dimensions.height} • {(image.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(image.url);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Copy URL"
                      >
                        {copiedUrl === image.url ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image);
                        }}
                        disabled={deleting === image.key}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === image.key ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {multiple && selectedImages.size > 0 && (
            <div className="p-4 border-t flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={handleSelectMultiple}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Insert Selected
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (embedded) {
    return <div className="h-full">{content}</div>;
  }

  // Modal wrapper
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col">
        {content}
      </div>
    </div>
  );
}