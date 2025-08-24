import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrackViewDto, TimeRange } from './dto/analytics.dto';
import { Types } from 'mongoose';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    trackView: jest.fn(),
    getPostAnalytics: jest.fn(),
    getOverallAnalytics: jest.fn(),
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    user: {
      userId: new Types.ObjectId().toString(),
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackView', () => {
    it('should track view for authenticated user', async () => {
      const postId = new Types.ObjectId().toString();
      const trackViewDto: TrackViewDto = {
        sessionId: 'test-session-123',
        referrer: 'https://google.com',
        duration: 120,
      };
      const userAgent = 'Mozilla/5.0';

      mockAnalyticsService.trackView.mockResolvedValue(undefined);

      const result = await controller.trackView(
        postId,
        trackViewDto,
        mockRequest as any,
        userAgent,
        mockRequest.user,
      );

      expect(result).toEqual({ message: 'View tracked successfully' });
      expect(mockAnalyticsService.trackView).toHaveBeenCalledWith(
        postId,
        trackViewDto,
        mockRequest.user.userId,
        mockRequest.ip,
        userAgent,
      );
    });

    it('should track view for unauthenticated user', async () => {
      const postId = new Types.ObjectId().toString();
      const trackViewDto: TrackViewDto = {
        sessionId: 'test-session-456',
        referrer: 'https://facebook.com',
        duration: 60,
      };
      const userAgent = 'Mozilla/5.0';

      const requestWithoutUser = {
        ...mockRequest,
        user: undefined,
      };

      mockAnalyticsService.trackView.mockResolvedValue(undefined);

      const result = await controller.trackView(
        postId,
        trackViewDto,
        requestWithoutUser as any,
        userAgent,
        undefined,
      );

      expect(result).toEqual({ message: 'View tracked successfully' });
      expect(mockAnalyticsService.trackView).toHaveBeenCalledWith(
        postId,
        trackViewDto,
        undefined,
        requestWithoutUser.ip,
        userAgent,
      );
    });

    it('should handle service errors', async () => {
      const postId = new Types.ObjectId().toString();
      const trackViewDto: TrackViewDto = {
        sessionId: 'test-session-789',
      };
      const userAgent = 'Mozilla/5.0';

      mockAnalyticsService.trackView.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        controller.trackView(postId, trackViewDto, mockRequest as any, userAgent, mockRequest.user),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getPostAnalytics', () => {
    it('should return post analytics', async () => {
      const postId = new Types.ObjectId().toString();
      const timeRange: TimeRange = { range: 'month' };

      const mockAnalytics = {
        postId,
        title: 'Test Post',
        totalViews: 500,
        uniqueViews: 200,
        avgDuration: 180,
        likesCount: 50,
        commentsCount: 25,
        sharesCount: 10,
        engagementRate: 15.5,
        deviceStats: {
          desktop: 300,
          mobile: 150,
          tablet: 50,
        },
        topReferrers: [
          { referrer: 'google.com', count: 100 },
          { referrer: 'facebook.com', count: 50 },
        ],
        viewsOverTime: [
          { date: '2024-01-01', views: 10 },
          { date: '2024-01-02', views: 15 },
        ],
      };

      mockAnalyticsService.getPostAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getPostAnalytics(postId, timeRange);

      expect(result).toEqual(mockAnalytics);
      expect(mockAnalyticsService.getPostAnalytics).toHaveBeenCalledWith(
        postId,
        timeRange,
      );
    });

    it('should use default time range when not provided', async () => {
      const postId = new Types.ObjectId().toString();

      mockAnalyticsService.getPostAnalytics.mockResolvedValue({
        postId,
        totalViews: 100,
      });

      await controller.getPostAnalytics(postId, {} as TimeRange);

      expect(mockAnalyticsService.getPostAnalytics).toHaveBeenCalledWith(
        postId,
        {},
      );
    });

    it('should handle post not found error', async () => {
      const postId = new Types.ObjectId().toString();
      const timeRange: TimeRange = { range: 'week' };

      mockAnalyticsService.getPostAnalytics.mockRejectedValue(
        new Error('Post not found'),
      );

      await expect(
        controller.getPostAnalytics(postId, timeRange),
      ).rejects.toThrow('Post not found');
    });
  });

  describe('getOverallAnalytics', () => {
    it('should return overall analytics for authenticated user', async () => {
      const timeRange = { range: 'month' };

      const mockDashboardData = {
        totalViews: 1000,
        totalPosts: 10,
        totalLikes: 100,
        totalComments: 50,
        viewsOverTime: [
          { date: '2024-01-01', views: 50 },
          { date: '2024-01-02', views: 75 },
        ],
        topPosts: [
          {
            _id: new Types.ObjectId(),
            title: 'Popular Post',
            views: 500,
            likes: 50,
            comments: 25,
          },
        ],
        growthRate: 25.5,
        avgEngagementRate: 12.3,
      };

      mockAnalyticsService.getOverallAnalytics.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getOverallAnalytics(
        mockRequest.user,
        timeRange as any,
      );

      expect(result).toEqual(mockDashboardData);
      expect(mockAnalyticsService.getOverallAnalytics).toHaveBeenCalledWith(
        mockRequest.user.userId,
        timeRange,
      );
    });

    it('should handle different time ranges', async () => {
      const timeRanges = ['day', 'week', 'month', 'year', 'all'];

      for (const range of timeRanges) {
        mockAnalyticsService.getOverallAnalytics.mockResolvedValue({
          totalViews: 100 * timeRanges.indexOf(range),
        });

        await controller.getOverallAnalytics(mockRequest.user, {
          range,
        } as any);

        expect(mockAnalyticsService.getOverallAnalytics).toHaveBeenCalledWith(
          mockRequest.user.userId,
          { range },
        );
      }
    });

    it('should handle service errors', async () => {
      const timeRange = { range: 'week' };

      mockAnalyticsService.getOverallAnalytics.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.getOverallAnalytics(mockRequest.user, timeRange as any),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('request handling', () => {
    it('should extract IP address correctly', async () => {
      const postId = new Types.ObjectId().toString();
      const trackViewDto: TrackViewDto = {
        sessionId: 'test-session',
      };
      const userAgent = 'Mozilla/5.0';

      const requestWithForwardedIP = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          'x-forwarded-for': '192.168.1.1',
        },
      };

      mockAnalyticsService.trackView.mockResolvedValue(undefined);

      await controller.trackView(
        postId,
        trackViewDto,
        requestWithForwardedIP as any,
        userAgent,
        mockRequest.user,
      );

      expect(mockAnalyticsService.trackView).toHaveBeenCalledWith(
        postId,
        trackViewDto,
        mockRequest.user.userId,
        requestWithForwardedIP.ip,
        userAgent,
      );
    });

    it('should handle missing user-agent', async () => {
      const postId = new Types.ObjectId().toString();
      const trackViewDto: TrackViewDto = {
        sessionId: 'test-session',
      };

      const requestWithoutUserAgent = {
        ...mockRequest,
        headers: {},
      };

      mockAnalyticsService.trackView.mockResolvedValue(undefined);

      await controller.trackView(
        postId,
        trackViewDto,
        requestWithoutUserAgent as any,
        undefined,
        mockRequest.user,
      );

      expect(mockAnalyticsService.trackView).toHaveBeenCalledWith(
        postId,
        trackViewDto,
        mockRequest.user.userId,
        requestWithoutUserAgent.ip,
        undefined,
      );
    });
  });
});