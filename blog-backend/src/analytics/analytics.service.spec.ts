import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsService } from './analytics.service';
import { ViewTracking } from './schemas/view-tracking.schema';
import { Post } from '../posts/schemas/post.schema';
import { TrackViewDto } from './dto/analytics.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let viewTrackingModel: Model<ViewTracking>;
  let postModel: Model<Post>;

  const mockViewTracking = {
    _id: new Types.ObjectId(),
    postId: new Types.ObjectId(),
    sessionId: 'test-session-123',
    userId: new Types.ObjectId(),
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    referrer: 'https://google.com',
    duration: 120,
    viewedAt: new Date(),
  };

  const mockPost = {
    _id: new Types.ObjectId(),
    title: 'Test Post',
    slug: 'test-post',
    author: new Types.ObjectId(),
    status: 'published',
    metadata: {
      views: 100,
      likes: 10,
      commentsCount: 5,
    },
  };

  const mockViewTrackingModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  const mockPostModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getModelToken(ViewTracking.name),
          useValue: mockViewTrackingModel,
        },
        {
          provide: getModelToken(Post.name),
          useValue: mockPostModel,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    viewTrackingModel = module.get<Model<ViewTracking>>(
      getModelToken(ViewTracking.name),
    );
    postModel = module.get<Model<Post>>(getModelToken(Post.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackView', () => {
    const trackViewDto: TrackViewDto = {
      sessionId: 'test-session-123',
      referrer: 'https://google.com',
      duration: 120,
    };

    it('should create new view tracking for first visit', async () => {
      const postId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      mockViewTrackingModel.findOne.mockResolvedValue(null);
      mockViewTrackingModel.create.mockResolvedValue(mockViewTracking);
      mockPostModel.findById.mockResolvedValue(mockPost);
      mockPostModel.findByIdAndUpdate.mockResolvedValue(mockPost);

      await service.trackView(
        postId,
        trackViewDto,
        userId,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(mockViewTrackingModel.findOne).toHaveBeenCalledWith({
        postId: new Types.ObjectId(postId),
        sessionId: trackViewDto.sessionId,
        viewedAt: {
          $gte: expect.any(Date),
        },
      });

      expect(mockViewTrackingModel.create).toHaveBeenCalledWith({
        postId: new Types.ObjectId(postId),
        sessionId: trackViewDto.sessionId,
        userId: new Types.ObjectId(userId),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        referrer: trackViewDto.referrer,
        duration: trackViewDto.duration,
        viewedAt: expect.any(Date),
      });

      expect(mockPostModel.findByIdAndUpdate).toHaveBeenCalledWith(
        postId,
        { $inc: { 'metadata.views': 1 } },
      );
    });

    it('should update existing view tracking for same session', async () => {
      const postId = new Types.ObjectId().toString();

      mockPostModel.findById.mockResolvedValue(mockPost);
      mockViewTrackingModel.findOne.mockResolvedValue(mockViewTracking);
      mockViewTrackingModel.findByIdAndUpdate.mockResolvedValue(
        mockViewTracking,
      );

      await service.trackView(postId, trackViewDto);

      expect(mockViewTrackingModel.findOne).toHaveBeenCalled();
      expect(mockViewTrackingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockViewTracking._id,
        {
          $set: { duration: trackViewDto.duration },
        },
      );
      expect(mockViewTrackingModel.create).not.toHaveBeenCalled();
      expect(mockPostModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle view tracking without userId', async () => {
      const postId = new Types.ObjectId().toString();

      mockViewTrackingModel.findOne.mockResolvedValue(null);
      mockViewTrackingModel.create.mockResolvedValue(mockViewTracking);
      mockPostModel.findById.mockResolvedValue(mockPost);
      mockPostModel.findByIdAndUpdate.mockResolvedValue(mockPost);

      await service.trackView(postId, trackViewDto);

      expect(mockViewTrackingModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: new Types.ObjectId(postId),
          sessionId: trackViewDto.sessionId,
          userId: undefined,
        }),
      );
    });
  });

  describe('getPostAnalytics', () => {
    it('should return analytics for a specific post', async () => {
      const postId = new Types.ObjectId().toString();
      const timeRange = { range: 'month' };

      const mockAnalytics = [
        {
          _id: null,
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
        },
      ];

      mockPostModel.findById.mockResolvedValue({
        ...mockPost,
        title: 'Test Post',
        metadata: {
          likes: 50,
          comments: 25,
          shares: 10,
        },
      });

      mockViewTrackingModel.find.mockResolvedValue([
        { sessionId: 'session1', duration: 180, userAgent: 'Mozilla' },
        { sessionId: 'session2', duration: 180, userAgent: 'Mozilla' },
      ]);
      
      // Mock the aggregate calls used in private methods
      mockViewTrackingModel.aggregate.mockResolvedValue([
        { _id: '2024-01-01', views: 10 },
        { _id: '2024-01-02', views: 15 },
      ]);

      const result = await service.getPostAnalytics(postId, timeRange);

      expect(result.postId).toBe(postId);
      expect(result.title).toBe('Test Post');
      expect(result.totalViews).toBe(2); // 2 views from mock data
      expect(result.uniqueViews).toBe(2); // 2 unique sessions
      expect(result.avgDuration).toBe(180);
      expect(result.likesCount).toBe(50);
      expect(result.commentsCount).toBe(25);
      expect(result.sharesCount).toBe(10);
      expect(result.deviceStats).toEqual({
        desktop: 2, // Both are desktop since userAgent doesn't contain mobile/tablet
        mobile: 0,
        tablet: 0,
      });

      expect(mockPostModel.findById).toHaveBeenCalledWith(postId);
      expect(mockViewTrackingModel.find).toHaveBeenCalled();
    });

    it('should handle post not found', async () => {
      const postId = new Types.ObjectId().toString();
      mockPostModel.findById.mockResolvedValue(null);

      await expect(
        service.getPostAnalytics(postId, { range: 'week' }),
      ).rejects.toThrow('Post not found');
    });

    it('should handle empty analytics data', async () => {
      const postId = new Types.ObjectId().toString();

      mockPostModel.findById.mockResolvedValue(mockPost);
      mockViewTrackingModel.find.mockResolvedValue([]);
      mockViewTrackingModel.aggregate.mockResolvedValue([]);

      const result = await service.getPostAnalytics(postId, { range: 'day' });

      expect(result.postId).toBe(postId);
      expect(result.title).toBe('Test Post');
      expect(result.totalViews).toBe(0);
      expect(result.uniqueViews).toBe(0);
      expect(result.avgDuration).toBe(0);
      expect(result.likesCount).toBe(10);
      expect(result.commentsCount).toBe(5);
      expect(result.sharesCount).toBe(0);
      expect(result.deviceStats).toEqual({
        desktop: 0,
        mobile: 0,
        tablet: 0,
      });
    });
  });

  describe('getOverallAnalytics', () => {
    it('should return overall analytics for a user', async () => {
      const userId = new Types.ObjectId().toString();

      const mockPosts = [
        { _id: new Types.ObjectId(), metadata: { likes: 50, comments: 25 } },
        { _id: new Types.ObjectId(), metadata: { likes: 50, comments: 25 } },
      ];

      mockPostModel.find.mockResolvedValue(mockPosts);
      mockViewTrackingModel.find.mockResolvedValue([
        { sessionId: 'session1', duration: 180, userAgent: 'Mozilla' },
        { sessionId: 'session2', duration: 180, userAgent: 'Mozilla' },
      ]);
      mockViewTrackingModel.aggregate.mockResolvedValue([
        { _id: new Types.ObjectId(), views: 500 },
      ]);

      const result = await service.getOverallAnalytics(userId, {
        range: 'month',
      });

      expect(result.totalPosts).toBe(2);
      expect(result.totalViews).toBe(2);
      expect(result.totalLikes).toBe(100);
      expect(result.totalComments).toBe(50);
      expect(mockPostModel.find).toHaveBeenCalledWith({ author: new Types.ObjectId(userId) });
    });

    it('should handle empty dashboard data', async () => {
      const userId = new Types.ObjectId().toString();

      mockPostModel.find.mockResolvedValue([]);
      mockViewTrackingModel.find.mockResolvedValue([]);
      mockViewTrackingModel.aggregate.mockResolvedValue([]);

      const result = await service.getOverallAnalytics(userId, {
        range: 'week',
      });

      expect(result.totalPosts).toBe(0);
      expect(result.totalViews).toBe(0);
      expect(result.totalLikes).toBe(0);
      expect(result.totalComments).toBe(0);
    });
  });

  describe('getDateRange', () => {
    it('should return correct date range for day', () => {
      const result = service['getDateRange']('day');
      const now = new Date();
      const expectedStart = new Date(
        now.getTime() - 24 * 60 * 60 * 1000,
      );

      expect(result.start.getTime()).toBeCloseTo(expectedStart.getTime(), -1000);
      expect(result.end.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return correct date range for week', () => {
      const result = service['getDateRange']('week');
      const now = new Date();
      const expectedStart = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000,
      );

      expect(result.start.getTime()).toBeCloseTo(expectedStart.getTime(), -1000);
      expect(result.end.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return correct date range for month', () => {
      const result = service['getDateRange']('month');
      const now = new Date();
      const expectedStart = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000,
      );

      expect(result.start.getTime()).toBeCloseTo(expectedStart.getTime(), -1000);
      expect(result.end.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return correct date range for year', () => {
      const result = service['getDateRange']('year');
      const now = new Date();
      const expectedStart = new Date(
        now.getTime() - 365 * 24 * 60 * 60 * 1000,
      );

      expect(result.start.getTime()).toBeCloseTo(expectedStart.getTime(), -1000);
      expect(result.end.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return epoch for all time', () => {
      const result = service['getDateRange']('all');
      expect(result.start).toEqual(new Date(0));
      expect(result.end.getTime()).toBeCloseTo(new Date().getTime(), -1000);
    });
  });

  describe('getDeviceStats', () => {
    it('should categorize device types correctly', () => {
      const mockViewData = [
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile' },
        { userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15' },
        { userAgent: 'Unknown Browser' },
        { userAgent: undefined },
      ];

      const result = service['getDeviceStats'](mockViewData as any);

      expect(result).toEqual({
        desktop: 3, // Windows, unknown, and undefined (all default to desktop)
        mobile: 1,
        tablet: 1,
      });
    });

    it('should handle empty view data', () => {
      const result = service['getDeviceStats']([] as any);

      expect(result).toEqual({
        desktop: 0,
        mobile: 0,
        tablet: 0,
      });
    });
  });
});