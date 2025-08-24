import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { CategoriesModule } from './categories/categories.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CacheModule } from './cache/cache.module';
import { HealthModule } from './health/health.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('database.uri'),
        connectionFactory: (connection) => {
          // Add connection event handlers
          const logger = new Logger('MongoDB');
          connection.on('connected', () => {
            logger.log('MongoDB connected successfully');
          });
          connection.on('error', (error) => {
            logger.error('MongoDB connection error', error);
          });
          connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
          });
          return connection;
        },
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        maxAge: '7d', // Cache static files for 7 days
      },
    }),
    CacheModule,
    AuthModule,
    UsersModule,
    UploadsModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    CategoriesModule,
    AnalyticsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware globally
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
    
    // Apply rate limiting middleware globally
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
    
    // Apply logger middleware
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
