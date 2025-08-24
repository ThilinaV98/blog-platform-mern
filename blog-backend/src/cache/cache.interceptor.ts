import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Skip caching for authenticated user-specific data
    const skipCache = request.headers['x-no-cache'] === 'true';
    if (skipCache) {
      return next.handle();
    }

    // Generate cache key from URL and query params
    const cacheKey = this.generateCacheKey(request);
    
    // Try to get data from cache
    const cachedResponse = await this.cacheService.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Get TTL from route metadata or use default
    const ttl = this.getTtlFromRoute(context) || 300; // 5 minutes default

    return next.handle().pipe(
      tap(async (response) => {
        // Cache the response
        await this.cacheService.set(cacheKey, response, ttl);
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const url = request.url;
    const userId = request.user?.userId || 'anonymous';
    return `http:${userId}:${url}`;
  }

  private getTtlFromRoute(context: ExecutionContext): number | undefined {
    const handler = context.getHandler();
    const controller = context.getClass();
    
    // Check for cache TTL metadata on handler or controller
    const handlerTtl = Reflect.getMetadata('cache:ttl', handler);
    const controllerTtl = Reflect.getMetadata('cache:ttl', controller);
    
    return handlerTtl || controllerTtl;
  }
}