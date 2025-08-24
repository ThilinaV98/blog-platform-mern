import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  ALL = 'all'
}

export class GetAnalyticsDto {
  @ApiPropertyOptional({ 
    enum: TimeRange,
    default: TimeRange.MONTH,
    description: 'Time range for analytics data'
  })
  @IsOptional()
  @IsEnum(TimeRange)
  range?: TimeRange = TimeRange.MONTH;

  @ApiPropertyOptional({ 
    description: 'Start date for custom range',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'End date for custom range',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class TrackViewDto {
  @ApiPropertyOptional({ 
    description: 'Session ID for tracking unique views'
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ 
    description: 'Referrer URL'
  })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ 
    description: 'Time spent on page in seconds'
  })
  @IsOptional()
  duration?: number;
}

export class PostAnalyticsResponseDto {
  postId: string;
  title: string;
  totalViews: number;
  uniqueViews: number;
  avgDuration: number;
  engagementRate: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsOverTime: {
    date: string;
    views: number;
  }[];
  topReferrers: {
    referrer: string;
    count: number;
  }[];
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export class OverallAnalyticsResponseDto {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementRate: number;
  topPosts: {
    postId: string;
    title: string;
    views: number;
    engagement: number;
  }[];
  growthTrend: {
    date: string;
    posts: number;
    views: number;
    engagement: number;
  }[];
  audienceInsights: {
    topCountries: { country: string; count: number }[];
    topCities: { city: string; count: number }[];
    deviceBreakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
  };
}