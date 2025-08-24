import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        if (isProduction && configService.get('REDIS_URL')) {
          // Production: Use Redis
          return {
            store: redisStore,
            url: configService.get('REDIS_URL'),
            ttl: 300, // 5 minutes default TTL
          };
        } else {
          // Development: Use in-memory cache
          return {
            ttl: 300, // 5 minutes default TTL
            max: 100, // Maximum number of items in cache
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}