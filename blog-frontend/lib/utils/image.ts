/**
 * Utility function to get the full URL for images
 * Handles both external URLs and local uploaded images
 */
export function getImageUrl(imagePath: string | undefined): string | undefined {
  if (!imagePath) return undefined;
  
  // If it's already a full URL (http/https), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /uploads, prepend the backend URL
  if (imagePath.startsWith('/uploads')) {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${imagePath}`;
  }
  
  // Otherwise, assume it's a relative path and needs the backend URL
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${imagePath}`;
}