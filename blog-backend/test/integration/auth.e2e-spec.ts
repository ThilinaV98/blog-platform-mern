import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp, createTestUser, createLoginDto } from '../setup';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const userData = createTestUser();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user).not.toHaveProperty('password');
      
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should not register duplicate email', async () => {
      const userData = createTestUser();

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409);
    });

    it('should not register duplicate username', async () => {
      const userData = createTestUser({
        email: 'different@example.com',
        username: 'testuser', // Same username
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });

    it('should validate email format', async () => {
      const userData = createTestUser({
        email: 'invalid-email',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should validate password strength', async () => {
      const userData = createTestUser({
        password: 'weak',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with email', async () => {
      const loginData = createLoginDto();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should login with username', async () => {
      const loginData = createLoginDto({
        emailOrUsername: 'testuser',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should not login with wrong password', async () => {
      const loginData = createLoginDto({
        password: 'wrongpassword',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should not login with non-existent user', async () => {
      const loginData = createLoginDto({
        emailOrUsername: 'nonexistent@example.com',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      // New tokens should be different
      expect(response.body.accessToken).not.toBe(accessToken);
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should return 400 without refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout with valid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(401);
    });

    it('should invalidate refresh token after logout', async () => {
      // First login to get new tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(createLoginDto())
        .expect(200);

      const newAccessToken = loginResponse.body.accessToken;
      const newRefreshToken = loginResponse.body.refreshToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      // Try to use the refresh token after logout
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(401);
    });
  });
});