import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ViewTracking, ViewTrackingSchema } from './schemas/view-tracking.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ViewTracking.name, schema: ViewTrackingSchema },
      { name: Post.name, schema: PostSchema }
    ])
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}