import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Types } from 'mongoose';
import {
  createTestApp,
  closeTestApp,
  createTestUser,
  createTestPost,
} from '../setup';

describe('Analytics API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let postId: string;
  let postSlug: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Register and login a test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createTestUser());

    accessToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;

    // Create a test post
    const postResponse = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createTestPost({ status: 'published' }));

    postId = postResponse.body._id;
    postSlug = postResponse.body.slug;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('/analytics/posts/:id/track (POST)', () => {
    it('should track view for a post', async () => {
      const trackData = {
        sessionId: 'test-session-123',
        referrer: 'https://google.com',
        duration: 120,
      };

      const response = await request(app.getHttpServer())
        .post(`/analytics/posts/${postId}/track`)
        .send(trackData)
        .expect(201);

      expect(response.body).toEqual({ success: true });
    });

    it('should track view without authentication', async () => {
      const trackData = {
        sessionId: 'test-session-456',
        referrer: 'https://facebook.com',
        duration: 60,
      };

      const response = await request(app.getHttpServer())
        .post(`/analytics/posts/${postId}/track`)
        .send(trackData)
        .expect(201);

      expect(response.body).toEqual({ success: true });
    });

    it('should track view with authentication', async () => {
      const trackData = {
        sessionId: 'test-session-789',
        referrer: 'https://twitter.com',
        duration: 180,
      };

      const response = await request(app.getHttpServer())
        .post(`/analytics/posts/${postId}/track`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(trackData)
        .expect(201);

      expect(response.body).toEqual({ success: true });
    });

    it('should not track duplicate view from same session within same day', async () => {
      const trackData = {
        sessionId: 'test-session-duplicate',
        referrer: 'https://google.com',
        duration: 100,
      };

      // First view
      await request(app.getHttpServer())
        .post(`/analytics/posts/${postId}/track`)
        .send(trackData)
        .expect(201);

      // Get analytics before duplicate
      const analyticsBefore = await request(app.getHttpServer())
        .get(`/analytics/posts/${postId}?range=day`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const viewsBefore = analyticsBefore.body.totalViews;

      // Attempt duplicate view
      await request(app.getHttpServer())
        .post(`/analytics/posts/${postId}/track`)
        .send({ ...trackData, duration: 50 })
        .expect(201);

      // Get analytics after duplicate attempt
      const analyticsAfter = await request(app.getHttpServer())
        .get(`/analytics/posts/${postId}?range=day`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Views should not increase, but duration might be updated
      expect(analyticsAfter.body.totalViews).toBe(viewsBefore);
    });

    it('should validate sessionId is required', async () => {
      const trackData = {
        referrer: 'https://google.com',
        duration: 120,
      };

      await request(app.getHttpServer())
        .post(`/analytics/posts/${postId}/track`)
        .send(trackData)
        .expect(400);
    });

    it('should handle invalid postId', async () => {
      const trackData = {
        sessionId: 'test-session-invalid',
        referrer: 'https://google.com',
        duration: 120,
      };

      await request(app.getHttpServer())
        .post(`/analytics/posts/invalid-id/track`)
        .send(trackData)
        .expect(400);
    });
  });

  describe('/analytics/posts/:id (GET)', () => {
    beforeAll(async () => {
      // Track some views to have data
      const sessions = ['session-1', 'session-2', 'session-3'];
      for (const sessionId of sessions) {
        await request(app.getHttpServer())
          .post(`/analytics/posts/${postId}/track`)
          .send({
            sessionId,
            referrer: 'https://example.com',
            duration: Math.floor(Math.random() * 300),
          });
      }
    });

    it('should get analytics for a post', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        postId,
        title: expect.any(String),
        totalViews: expect.any(Number),
        uniqueViews: expect.any(Number),
        avgDuration: expect.any(Number),
        likesCount: expect.any(Number),
        commentsCount: expect.any(Number),
        sharesCount: expect.any(Number),
        engagementRate: expect.any(Number),
        deviceStats: {
          desktop: expect.any(Number),
          mobile: expect.any(Number),
          tablet: expect.any(Number),
        },
        topReferrers: expect.any(Array),
        viewsOverTime: expect.any(Array),
      });

      expect(response.body.totalViews).toBeGreaterThan(0);
      expect(response.body.uniqueViews).toBeGreaterThan(0);
    });

    it('should filter analytics by time range', async () => {
      const timeRanges = ['day', 'week', 'month', 'year', 'all'];

      for (const range of timeRanges) {
        const response = await request(app.getHttpServer())
          .get(`/analytics/posts/${postId}?range=${range}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('postId', postId);
        expect(response.body).toHaveProperty('totalViews');
      }
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/analytics/posts/${postId}`)
        .expect(401);
    });

    it('should return 404 for non-existent post', async () => {
      const fakePostId = new Types.ObjectId().toString();

      await request(app.getHttpServer())
        .get(`/analytics/posts/${fakePostId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should handle invalid postId format', async () => {
      await request(app.getHttpServer())
        .get('/analytics/posts/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('/analytics/dashboard (GET)', () => {
    beforeAll(async () => {
      // Create more posts and track views
      for (let i = 0; i < 3; i++) {
        const postResponse = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createTestPost({ 
            title: `Test Post ${i}`,
            status: 'published' 
          }));

        const postId = postResponse.body._id;

        // Track views for each post
        for (let j = 0; j < 5; j++) {
          await request(app.getHttpServer())
            .post(`/analytics/posts/${postId}/track`)
            .send({
              sessionId: `session-${i}-${j}`,
              referrer: 'https://example.com',
              duration: Math.floor(Math.random() * 300),
            });
        }
      }
    });

    it('should get dashboard analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalViews: expect.any(Number),
        totalPosts: expect.any(Number),
        totalLikes: expect.any(Number),
        totalComments: expect.any(Number),
        viewsOverTime: expect.any(Array),
        topPosts: expect.any(Array),
        growthRate: expect.any(Number),
        avgEngagementRate: expect.any(Number),
      });

      expect(response.body.totalPosts).toBeGreaterThan(0);
      expect(response.body.totalViews).toBeGreaterThan(0);
    });

    it('should filter dashboard analytics by time range', async () => {
      const timeRanges = ['day', 'week', 'month', 'year', 'all'];

      for (const range of timeRanges) {
        const response = await request(app.getHttpServer())
          .get(`/analytics/dashboard?range=${range}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalViews');
        expect(response.body).toHaveProperty('totalPosts');
      }
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .expect(401);
    });

    it('should return user-specific analytics', async () => {
      // Create another user
      const anotherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(createTestUser({
          email: 'another@example.com',
          username: 'anotheruser',
        }));

      const anotherAccessToken = anotherUserResponse.body.accessToken;

      // Get analytics for the new user (should be empty)
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${anotherAccessToken}`)
        .expect(200);

      expect(response.body.totalPosts).toBe(0);
      expect(response.body.totalViews).toBe(0);
    });

    it('should include top posts in analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard?range=all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.topPosts).toBeInstanceOf(Array);
      if (response.body.topPosts.length > 0) {
        expect(response.body.topPosts[0]).toMatchObject({
          _id: expect.any(String),
          title: expect.any(String),
          views: expect.any(Number),
          likes: expect.any(Number),
          comments: expect.any(Number),
        });
      }
    });

    it('should calculate growth rate correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard?range=month')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.growthRate).toBeDefined();
      expect(typeof response.body.growthRate).toBe('number');
    });
  });

  describe('Analytics data integrity', () => {
    it('should track device type correctly', async () => {
      const postResponse = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTestPost({ status: 'published' }));

      const testPostId = postResponse.body._id;

      // Track from different devices
      const devices = [
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          expectedDevice: 'desktop',
        },
        {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          expectedDevice: 'mobile',
        },
        {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          expectedDevice: 'tablet',
        },
      ];

      for (let i = 0; i < devices.length; i++) {
        await request(app.getHttpServer())
          .post(`/analytics/posts/${testPostId}/track`)
          .set('User-Agent', devices[i].userAgent)
          .send({
            sessionId: `device-session-${i}`,
            duration: 100,
          })
          .expect(201);
      }

      const analyticsResponse = await request(app.getHttpServer())
        .get(`/analytics/posts/${testPostId}?range=day`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(analyticsResponse.body.deviceStats.desktop).toBeGreaterThan(0);
      expect(analyticsResponse.body.deviceStats.mobile).toBeGreaterThan(0);
      expect(analyticsResponse.body.deviceStats.tablet).toBeGreaterThan(0);
    });

    it('should track referrers correctly', async () => {
      const postResponse = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTestPost({ status: 'published' }));

      const testPostId = postResponse.body._id;

      const referrers = [
        'https://google.com',
        'https://facebook.com',
        'https://twitter.com',
        'https://google.com', // Duplicate to test counting
      ];

      for (let i = 0; i < referrers.length; i++) {
        await request(app.getHttpServer())
          .post(`/analytics/posts/${testPostId}/track`)
          .send({
            sessionId: `referrer-session-${i}`,
            referrer: referrers[i],
            duration: 100,
          })
          .expect(201);
      }

      const analyticsResponse = await request(app.getHttpServer())
        .get(`/analytics/posts/${testPostId}?range=day`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(analyticsResponse.body.topReferrers).toBeInstanceOf(Array);
      expect(analyticsResponse.body.topReferrers.length).toBeGreaterThan(0);
      
      const googleReferrer = analyticsResponse.body.topReferrers.find(
        (r: any) => r.referrer === 'google.com',
      );
      expect(googleReferrer).toBeDefined();
      expect(googleReferrer.count).toBe(2);
    });
  });
});