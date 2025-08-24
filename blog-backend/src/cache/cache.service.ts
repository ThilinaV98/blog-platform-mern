import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    // Note: cache-manager v5 doesn't have reset, clear all keys manually
    try {
      const stores = (this.cacheManager as any).stores;
      if (stores && stores[0]) {
        await stores[0].clear();
      }
    } catch (error) {
      // Fallback: no-op if clear is not available
      this.logger.warn('Cache reset not available', error.message);
    }
  }

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return await this.cacheManager.wrap(key, fn, ttl);
  }

  // Cache key generators
  generatePostKey(postId: string): string {
    return `post:${postId}`;
  }

  generatePostListKey(filters: any): string {
    return `posts:${JSON.stringify(filters)}`;
  }

  generateUserKey(userId: string): string {
    return `user:${userId}`;
  }

  generateCommentKey(postId: string, page: number = 1): string {
    return `comments:${postId}:${page}`;
  }

  generateAnalyticsKey(type: string, id: string): string {
    return `analytics:${type}:${id}`;
  }

  // Invalidation patterns
  async invalidatePostCache(postId?: string): Promise<void> {
    if (postId) {
      await this.del(this.generatePostKey(postId));
    }
    // Invalidate all post lists when a post is modified
    // Note: cache-manager v5 doesn't expose keys directly
    // We'll need to track keys manually or use a pattern-based approach
    // For now, we'll just invalidate known patterns
    for (let i = 1; i <= 10; i++) {
      await this.del(`posts:page:${i}`);
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(this.generateUserKey(userId));
  }

  async invalidateCommentCache(postId: string): Promise<void> {
    // Invalidate known comment cache patterns
    for (let i = 1; i <= 10; i++) {
      await this.del(`comments:${postId}:${i}`);
    }
  }
}