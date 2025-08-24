import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, createTestUser, createLoginDto, createTestPost } from '../setup';

describe('Posts API (e2e)', () => {
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
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('/posts (POST)', () => {
    it('should create a new post', async () => {
      const postData = createTestPost();

      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('slug');
      expect(response.body.title).toBe(postData.title);
      expect(response.body.content).toBe(postData.content);
      expect(response.body.status).toBe('draft');
      expect(response.body.author).toHaveProperty('_id');
      
      postId = response.body._id;
      postSlug = response.body.slug;
    });

    it('should not create post without authentication', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send(createTestPost())
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should generate unique slug for duplicate titles', async () => {
      const postData = createTestPost({ title: 'Test Post Title' }); // Same title

      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.slug).not.toBe(postSlug);
      expect(response.body.slug).toContain('test-post-title');
    });
  });

  describe('/posts (GET)', () => {
    it('should get all published posts without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts')
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
    });

    it('should filter posts by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts?status=draft')
        .expect(200);

      // Should return empty for unauthenticated requests
      expect(response.body.posts).toHaveLength(0);
    });

    it('should filter posts by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts?category=Technology')
        .expect(200);

      response.body.posts.forEach((post: any) => {
        expect(post.category).toBe('Technology');
      });
    });

    it('should search posts', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts?search=test')
        .expect(200);

      expect(response.body).toHaveProperty('posts');
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts?page=1&limit=5')
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });
  });

  describe('/posts/my (GET)', () => {
    it('should get user\'s own posts including drafts', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(response.body.posts.length).toBeGreaterThan(0);
      
      // Should include draft posts
      const draftPosts = response.body.posts.filter((p: any) => p.status === 'draft');
      expect(draftPosts.length).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/posts/my')
        .expect(401);
    });
  });

  describe('/posts/:id (GET)', () => {
    it('should get post by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body._id).toBe(postId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('content');
    });

    it('should return 404 for non-existent post', async () => {
      await request(app.getHttpServer())
        .get('/posts/507f1f77bcf86cd799439999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid post ID', async () => {
      await request(app.getHttpServer())
        .get('/posts/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('/posts/slug/:slug (GET)', () => {
    it('should get post by slug and increment view count', async () => {
      // First publish the post
      await request(app.getHttpServer())
        .patch(`/posts/${postId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/posts/slug/${postSlug}`)
        .expect(200);

      expect(response.body.slug).toBe(postSlug);
      expect(response.body.metadata.views).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent slug', async () => {
      await request(app.getHttpServer())
        .get('/posts/slug/non-existent-slug')
        .expect(404);
    });
  });

  describe('/posts/:id (PATCH)', () => {
    it('should update own post', async () => {
      const updateData = {
        title: 'Updated Post Title',
        content: '<p>Updated content</p>',
      };

      const response = await request(app.getHttpServer())
        .patch(`/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.content).toBe(updateData.content);
      expect(response.body.slug).toContain('updated-post-title');
    });

    it('should not update without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/posts/${postId}`)
        .send({ title: 'New Title' })
        .expect(401);
    });

    it('should not update other user\'s post', async () => {
      // Register another user
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(createTestUser({
          email: 'other@example.com',
          username: 'otheruser',
        }));

      const otherToken = newUserResponse.body.accessToken;

      await request(app.getHttpServer())
        .patch(`/posts/${postId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);
    });
  });

  describe('/posts/:id/publish (PATCH)', () => {
    it('should publish a draft post', async () => {
      // Create a new draft post
      const createResponse = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTestPost({ title: 'Post to Publish' }));

      const draftId = createResponse.body._id;

      const response = await request(app.getHttpServer())
        .patch(`/posts/${draftId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('published');
      expect(response.body.publishedAt).toBeDefined();
    });

    it('should not publish already published post', async () => {
      await request(app.getHttpServer())
        .patch(`/posts/${postId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('/posts/:id/archive (PATCH)', () => {
    it('should archive a post', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/posts/${postId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('archived');
    });

    it('should not archive already archived post', async () => {
      await request(app.getHttpServer())
        .patch(`/posts/${postId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('/posts/:id/unarchive (PATCH)', () => {
    it('should unarchive a post back to draft', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/posts/${postId}/unarchive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('draft');
    });

    it('should not unarchive non-archived post', async () => {
      await request(app.getHttpServer())
        .patch(`/posts/${postId}/unarchive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('/posts/:id (DELETE)', () => {
    it('should delete own post', async () => {
      // Create a post to delete
      const createResponse = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTestPost({ title: 'Post to Delete' }));

      const deleteId = createResponse.body._id;

      await request(app.getHttpServer())
        .delete(`/posts/${deleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/posts/${deleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should not delete without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/posts/${postId}`)
        .expect(401);
    });
  });

  describe('/posts/stats (GET)', () => {
    it('should get user post statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalPosts');
      expect(response.body).toHaveProperty('publishedPosts');
      expect(response.body).toHaveProperty('draftPosts');
      expect(response.body).toHaveProperty('archivedPosts');
      expect(response.body).toHaveProperty('totalViews');
      expect(response.body).toHaveProperty('totalLikes');
      expect(response.body).toHaveProperty('recentPosts');
      expect(Array.isArray(response.body.recentPosts)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/posts/stats')
        .expect(401);
    });
  });

  describe('/posts/categories (GET)', () => {
    it('should get all categories with counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('category');
        expect(response.body[0]).toHaveProperty('count');
      }
    });
  });

  describe('/posts/tags (GET)', () => {
    it('should get all tags with counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts/tags')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('tag');
        expect(response.body[0]).toHaveProperty('count');
      }
    });
  });
});