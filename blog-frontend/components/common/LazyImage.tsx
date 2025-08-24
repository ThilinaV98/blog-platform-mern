'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  fill?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  fill = false,
  sizes,
  objectFit = 'cover',
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Generate a simple blur placeholder if not provided
  const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

  if (fill) {
    return (
      <div ref={imgRef} className={cn('relative', className)}>
        {isInView && (
          <>
            {!isLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
            )}
            <Image
              src={src}
              alt={alt}
              fill
              quality={quality}
              placeholder={placeholder}
              blurDataURL={blurDataURL || defaultBlurDataURL}
              onLoad={handleLoad}
              className={cn(
                'object-cover transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              sizes={sizes || '100vw'}
              priority={priority}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      {isInView && (
        <>
          {!isLoaded && (
            <div 
              className="absolute inset-0 bg-gray-200 animate-pulse rounded"
              style={{ width, height }}
            />
          )}
          <Image
            src={src}
            alt={alt}
            width={width || 500}
            height={height || 300}
            quality={quality}
            placeholder={placeholder}
            blurDataURL={blurDataURL || defaultBlurDataURL}
            onLoad={handleLoad}
            className={cn(
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            priority={priority}
          />
        </>
      )}
    </div>
  );
}