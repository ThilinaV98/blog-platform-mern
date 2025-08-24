import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ViewTracking, ViewTrackingDocument } from './schemas/view-tracking.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { 
  GetAnalyticsDto, 
  TrackViewDto, 
  PostAnalyticsResponseDto, 
  OverallAnalyticsResponseDto,
  TimeRange 
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(ViewTracking.name) private viewTrackingModel: Model<ViewTrackingDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  /**
   * Track a post view
   */
  async trackView(
    postId: string, 
    dto: TrackViewDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if this session has already viewed this post today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingView = await this.viewTrackingModel.findOne({
      postId: new Types.ObjectId(postId),
      sessionId: dto.sessionId,
      viewedAt: { $gte: today }
    });

    if (!existingView) {
      // Create new view tracking record
      await this.viewTrackingModel.create({
        postId: new Types.ObjectId(postId),
        userId: userId ? new Types.ObjectId(userId) : undefined,
        sessionId: dto.sessionId || this.generateSessionId(),
        ipAddress,
        userAgent,
        referrer: dto.referrer,
        duration: dto.duration || 0,
        viewedAt: new Date()
      });

      // Increment view count in post
      await this.postModel.findByIdAndUpdate(postId, {
        $inc: { 'metadata.views': 1 }
      });
    } else if (dto.duration) {
      // Update duration if provided
      await this.viewTrackingModel.findByIdAndUpdate(existingView._id, {
        $set: { duration: dto.duration }
      });
    }
  }

  /**
   * Get analytics for a specific post
   */
  async getPostAnalytics(postId: string, query: GetAnalyticsDto): Promise<PostAnalyticsResponseDto> {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const dateRange = this.getDateRange(query.range, query.startDate, query.endDate);
    
    // Get view tracking data
    const viewData = await this.viewTrackingModel.find({
      postId: new Types.ObjectId(postId),
      viewedAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Calculate metrics
    const totalViews = viewData.length;
    const uniqueViews = new Set(viewData.map(v => v.sessionId)).size;
    const avgDuration = viewData.reduce((acc, v) => acc + v.duration, 0) / (totalViews || 1);
    
    // Get views over time
    const viewsOverTime = await this.getViewsOverTime(postId, dateRange);
    
    // Get top referrers
    const topReferrers = await this.getTopReferrers(postId, dateRange);
    
    // Get device stats (simplified - would need proper user agent parsing)
    const deviceStats = this.getDeviceStats(viewData);
    
    // Calculate engagement rate
    const engagementRate = this.calculateEngagementRate(
      post.metadata.likes,
      post.metadata.comments,
      totalViews
    );

    return {
      postId: post._id.toString(),
      title: post.title,
      totalViews,
      uniqueViews,
      avgDuration: Math.round(avgDuration),
      engagementRate,
      likesCount: post.metadata.likes,
      commentsCount: post.metadata.comments,
      sharesCount: post.metadata.shares || 0,
      viewsOverTime,
      topReferrers,
      deviceStats
    };
  }

  /**
   * Get overall analytics for a user's posts
   */
  async getOverallAnalytics(userId: string, query: GetAnalyticsDto): Promise<OverallAnalyticsResponseDto> {
    const dateRange = this.getDateRange(query.range, query.startDate, query.endDate);
    const userObjectId = new Types.ObjectId(userId);

    // Get user's posts
    const posts = await this.postModel.find({ author: userObjectId });
    const postIds = posts.map(p => p._id);

    // Get all view data for user's posts
    const viewData = await this.viewTrackingModel.find({
      postId: { $in: postIds },
      viewedAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Calculate overall metrics
    const totalViews = viewData.length;
    const totalLikes = posts.reduce((acc, p) => acc + p.metadata.likes, 0);
    const totalComments = posts.reduce((acc, p) => acc + p.metadata.comments, 0);
    
    // Get top performing posts
    const topPosts = await this.getTopPosts(postIds, dateRange);
    
    // Get growth trend
    const growthTrend = await this.getGrowthTrend(postIds, dateRange);
    
    // Get audience insights
    const audienceInsights = await this.getAudienceInsights(postIds, dateRange);
    
    // Calculate average engagement rate
    const avgEngagementRate = this.calculateEngagementRate(totalLikes, totalComments, totalViews);

    return {
      totalPosts: posts.length,
      totalViews,
      totalLikes,
      totalComments,
      avgEngagementRate,
      topPosts,
      growthTrend,
      audienceInsights
    };
  }

  /**
   * Helper: Get date range based on time range
   */
  private getDateRange(range?: TimeRange, startDate?: string, endDate?: string) {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (range) {
        case TimeRange.DAY:
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case TimeRange.WEEK:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.MONTH:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.YEAR:
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(0); // All time
      }
    }

    return { start, end };
  }

  /**
   * Helper: Get views over time
   */
  private async getViewsOverTime(postId: string, dateRange: { start: Date; end: Date }) {
    const pipeline = [
      {
        $match: {
          postId: new Types.ObjectId(postId),
          viewedAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          views: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 as 1 | -1 } }
    ];

    const result = await this.viewTrackingModel.aggregate(pipeline);
    return result.map(r => ({ date: r._id, views: r.views }));
  }

  /**
   * Helper: Get top referrers
   */
  private async getTopReferrers(postId: string, dateRange: { start: Date; end: Date }) {
    const pipeline = [
      {
        $match: {
          postId: new Types.ObjectId(postId),
          viewedAt: { $gte: dateRange.start, $lte: dateRange.end },
          referrer: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 as 1 | -1 } },
      { $limit: 5 }
    ];

    const result = await this.viewTrackingModel.aggregate(pipeline);
    return result.map(r => ({ referrer: r._id || 'Direct', count: r.count }));
  }

  /**
   * Helper: Get device stats (simplified)
   */
  private getDeviceStats(viewData: ViewTrackingDocument[]) {
    let desktop = 0;
    let mobile = 0;
    let tablet = 0;

    viewData.forEach(view => {
      const ua = view.userAgent?.toLowerCase() || '';
      if (ua.includes('mobile')) {
        mobile++;
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        tablet++;
      } else {
        desktop++;
      }
    });

    return { desktop, mobile, tablet };
  }

  /**
   * Helper: Calculate engagement rate
   */
  private calculateEngagementRate(likes: number, comments: number, views: number): number {
    if (views === 0) return 0;
    return Math.round(((likes + comments) / views) * 100);
  }

  /**
   * Helper: Get top posts
   */
  private async getTopPosts(postIds: Types.ObjectId[], dateRange: { start: Date; end: Date }) {
    const pipeline = [
      {
        $match: {
          postId: { $in: postIds },
          viewedAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: '$postId',
          views: { $sum: 1 }
        }
      },
      { $sort: { views: -1 as 1 | -1 } },
      { $limit: 5 }
    ];

    const viewResults = await this.viewTrackingModel.aggregate(pipeline);
    
    const topPostsRaw = await Promise.all(
      viewResults.map(async (v) => {
        const post = await this.postModel.findById(v._id);
        if (!post) {
          return null;
        }
        const engagement = this.calculateEngagementRate(
          post.metadata.likes,
          post.metadata.comments,
          v.views
        );
        return {
          postId: v._id.toString(),
          title: post.title,
          views: v.views,
          engagement
        };
      })
    );
    
    const topPosts = topPostsRaw.filter(p => p !== null);

    return topPosts;
  }

  /**
   * Helper: Get growth trend
   */
  private async getGrowthTrend(postIds: Types.ObjectId[], dateRange: { start: Date; end: Date }) {
    const pipeline = [
      {
        $match: {
          postId: { $in: postIds },
          viewedAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          views: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 as 1 | -1 } }
    ];

    const result = await this.viewTrackingModel.aggregate(pipeline);
    
    // For simplicity, returning view data as growth trend
    // In production, would include posts created and engagement metrics
    return result.map(r => ({
      date: r._id,
      posts: 0, // Would need separate calculation
      views: r.views,
      engagement: 0 // Would need separate calculation
    }));
  }

  /**
   * Helper: Get audience insights
   */
  private async getAudienceInsights(postIds: Types.ObjectId[], dateRange: { start: Date; end: Date }) {
    const viewData = await this.viewTrackingModel.find({
      postId: { $in: postIds },
      viewedAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Get device breakdown
    const deviceBreakdown = this.getDeviceStats(viewData);

    // For production, would parse IP addresses for country/city data
    // For now, returning mock data
    const topCountries = [
      { country: 'United States', count: Math.floor(viewData.length * 0.4) },
      { country: 'United Kingdom', count: Math.floor(viewData.length * 0.2) },
      { country: 'Canada', count: Math.floor(viewData.length * 0.15) }
    ];

    const topCities = [
      { city: 'New York', count: Math.floor(viewData.length * 0.15) },
      { city: 'London', count: Math.floor(viewData.length * 0.12) },
      { city: 'San Francisco', count: Math.floor(viewData.length * 0.1) }
    ];

    return {
      topCountries,
      topCities,
      deviceBreakdown
    };
  }

  /**
   * Helper: Generate session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}