import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import { createTestApp, closeTestApp, createTestUser, createLoginDto } from '../setup';

describe('Users API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let otherUserId: string;
  let otherAccessToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Register main test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createTestUser());

    accessToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;

    // Register another user
    const otherUserResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
        displayName: 'Other User',
      }));

    otherUserId = otherUserResponse.body.user.id;
    otherAccessToken = otherUserResponse.body.accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('/users/profile (GET)', () => {
    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('profile');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });
  });

  describe('/users/profile (PATCH)', () => {
    it('should update user profile', async () => {
      const updateData = {
        displayName: 'Updated Display Name',
        bio: 'This is my updated bio',
        website: 'https://example.com',
        location: 'San Francisco, CA',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.profile.displayName).toBe(updateData.displayName);
      expect(response.body.profile.bio).toBe(updateData.bio);
      expect(response.body.profile.website).toBe(updateData.website);
      expect(response.body.profile.location).toBe(updateData.location);
    });

    it('should validate website URL format', async () => {
      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ website: 'invalid-url' })
        .expect(400);
    });

    it('should update social links', async () => {
      const updateData = {
        socialLinks: {
          twitter: 'https://twitter.com/testuser',
          github: 'https://github.com/testuser',
          linkedin: 'https://linkedin.com/in/testuser',
        },
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.profile.socialLinks).toEqual(updateData.socialLinks);
    });
  });

  describe('/users/change-password (POST)', () => {
    it('should change password with correct current password', async () => {
      const passwordData = {
        currentPassword: 'Test123!@#',
        newPassword: 'NewTest123!@#',
      };

      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(200);

      // Verify can login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'NewTest123!@#',
        })
        .expect(200);

      accessToken = loginResponse.body.accessToken; // Update token
    });

    it('should not change password with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'AnotherTest123!@#',
      };

      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(401);
    });

    it('should validate new password strength', async () => {
      const passwordData = {
        currentPassword: 'NewTest123!@#',
        newPassword: 'weak',
      };

      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);
    });

    it('should invalidate refresh tokens after password change', async () => {
      // Get a refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'NewTest123!@#',
        });

      const refreshToken = loginResponse.body.refreshToken;
      accessToken = loginResponse.body.accessToken;

      // Change password
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'NewTest123!@#',
          newPassword: 'Test123!@#', // Change back
        })
        .expect(200);

      // Old refresh token should be invalid
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      // Login again to get new token
      const newLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'Test123!@#',
        });

      accessToken = newLoginResponse.body.accessToken;
    });
  });

  describe('/users/avatar (POST)', () => {
    it('should upload avatar image', async () => {
      // Create a test image buffer
      const imageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app.getHttpServer())
        .post('/users/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', imageBuffer, {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body).toHaveProperty('avatarUrl');
      expect(response.body.avatarUrl).toContain('/uploads/avatars/');
    });

    it('should reject non-image files', async () => {
      const textBuffer = Buffer.from('not-an-image');
      
      await request(app.getHttpServer())
        .post('/users/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', textBuffer, {
          filename: 'file.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('should reject oversized files', async () => {
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      
      await request(app.getHttpServer())
        .post('/users/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', largeBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        })
        .expect(413);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/users/avatar')
        .expect(401);
    });
  });

  describe('/users/avatar (DELETE)', () => {
    it('should delete user avatar', async () => {
      await request(app.getHttpServer())
        .delete('/users/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify avatar is removed
      const profileResponse = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.profile.avatar).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete('/users/avatar')
        .expect(401);
    });
  });

  describe('/users/:username (GET)', () => {
    it('should get public user profile by username', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/testuser')
        .expect(200);

      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('profile');
      expect(response.body).not.toHaveProperty('email'); // Email should be private
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent username', async () => {
      await request(app.getHttpServer())
        .get('/users/nonexistentuser')
        .expect(404);
    });

    it('should include post count in public profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/testuser')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalPosts');
      expect(response.body.stats).toHaveProperty('totalPublishedPosts');
    });
  });

  describe('/users (GET)', () => {
    it('should get list of users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2); // At least our 2 test users
      
      // Should not include sensitive data
      response.body.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('refreshTokens');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=1')
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.users.length).toBeLessThanOrEqual(1);
      expect(response.body.meta.limit).toBe(1);
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete own account', async () => {
      // Create a user to delete
      const deleteUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(createTestUser({
          email: 'delete@example.com',
          username: 'deleteuser',
        }));

      const deleteToken = deleteUserResponse.body.accessToken;
      const deleteUserId = deleteUserResponse.body.user.id;

      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(200);

      // Verify user is deleted
      await request(app.getHttpServer())
        .get('/users/deleteuser')
        .expect(404);
    });

    it('should not delete other user\'s account', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(401);
    });
  });
});