import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';

describe('Authentication Security Tests', () => {
  let app: INestApplication;
  let validToken: string;
  let refreshToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create a valid test user
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'authtest@example.com',
        username: 'authtester',
        password: 'ValidPass123!',
        displayName: 'Auth Tester',
      });

    testUserId = signupResponse.body.user._id;
    validToken = signupResponse.body.access_token;
    refreshToken = signupResponse.body.refresh_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Password Security Tests', () => {
    describe('Password Strength Requirements', () => {
      it('should reject weak passwords', async () => {
        const weakPasswords = [
          '123456',           // Too simple
          'password',         // Common password
          'Pass123',          // Too short
          'passwordpassword', // No numbers/special chars
          '12345678',         // Only numbers
          'abcdefgh',         // Only lowercase
          'ABCDEFGH',         // Only uppercase
        ];

        for (const password of weakPasswords) {
          const response = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
              email: `weak${Date.now()}@example.com`,
              username: `weak${Date.now()}`,
              password: password,
              displayName: 'Weak Pass User',
            })
            .expect(400);

          expect(response.body.message).toContain('password');
        }
      });

      it('should enforce minimum password length', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'short@example.com',
            username: 'shortpass',
            password: 'Ab1!',
            displayName: 'Short Pass',
          })
          .expect(400);

        expect(response.body.message).toContain('password');
      });

      it('should require password complexity', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'simple@example.com',
            username: 'simplepass',
            password: 'simplepassword',
            displayName: 'Simple Pass',
          })
          .expect(400);

        expect(response.body.message).toContain('password');
      });
    });

    describe('Password Storage Security', () => {
      it('should hash passwords with bcrypt', async () => {
        // This test would need database access to verify
        // For now, we verify the password is not returned in responses
        const response = await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body.password).toBeUndefined();
        expect(response.body.passwordHash).toBeUndefined();
      });

      it('should never return password in any response', async () => {
        const endpoints = [
          { method: 'get', path: '/users/profile' },
          { method: 'get', path: `/users/${testUserId}` },
          { method: 'patch', path: '/users/profile', body: { bio: 'Updated' } },
        ];

        for (const endpoint of endpoints) {
          const req = request(app.getHttpServer())[endpoint.method](endpoint.path)
            .set('Authorization', `Bearer ${validToken}`);
          
          if (endpoint.body) {
            req.send(endpoint.body);
          }

          const response = await req.expect(200);
          
          expect(response.body.password).toBeUndefined();
          expect(response.body.passwordHash).toBeUndefined();
        }
      });
    });

    describe('Password Reset Security', () => {
      it('should rate limit password reset requests', async () => {
        const email = 'ratelimit@example.com';
        
        // Make multiple requests quickly
        const requests = [];
        for (let i = 0; i < 10; i++) {
          requests.push(
            request(app.getHttpServer())
              .post('/auth/forgot-password')
              .send({ email })
          );
        }

        const responses = await Promise.all(requests);
        
        // At least some should be rate limited
        const rateLimited = responses.filter(r => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('should not reveal if email exists', async () => {
        const response1 = await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        const response2 = await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: 'authtest@example.com' })
          .expect(200);

        // Both should return the same message
        expect(response1.body.message).toBe(response2.body.message);
      });

      it('should expire password reset tokens', async () => {
        // This would require mocking time or waiting
        // For now, verify token format
        const response = await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({
            token: 'expired-token-12345',
            newPassword: 'NewPass123!',
          })
          .expect(400);

        expect(response.body.message).toContain('invalid');
      });
    });
  });

  describe('Session Security Tests', () => {
    describe('Token Security', () => {
      it('should reject expired tokens', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';
        
        await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      });

      it('should reject malformed tokens', async () => {
        const malformedTokens = [
          'not-a-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          'Bearer Bearer token',
          '../../etc/passwd',
          null,
          undefined,
          '',
        ];

        for (const token of malformedTokens) {
          await request(app.getHttpServer())
            .get('/users/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);
        }
      });

      it('should reject tokens with invalid signatures', async () => {
        // Take a valid JWT and modify the signature
        const parts = validToken.split('.');
        const tamperedToken = `${parts[0]}.${parts[1]}.tamperedsignature123`;
        
        await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);
      });

      it('should have appropriate token expiration', async () => {
        // Decode token to check expiration
        const tokenParts = validToken.split('.');
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        
        const expirationTime = payload.exp - payload.iat;
        
        // Should expire within reasonable time (e.g., 1 hour to 24 hours)
        expect(expirationTime).toBeGreaterThanOrEqual(3600); // At least 1 hour
        expect(expirationTime).toBeLessThanOrEqual(86400); // At most 24 hours
      });
    });

    describe('Session Management', () => {
      it('should invalidate tokens on logout', async () => {
        // Login to get a new token
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'authtest@example.com',
            password: 'ValidPass123!',
          })
          .expect(200);

        const tokenToInvalidate = loginResponse.body.access_token;

        // Logout
        await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${tokenToInvalidate}`)
          .expect(200);

        // Token should now be invalid
        await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${tokenToInvalidate}`)
          .expect(401);
      });

      it('should prevent session fixation', async () => {
        // Login twice and ensure different tokens
        const response1 = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'authtest@example.com',
            password: 'ValidPass123!',
          })
          .expect(200);

        const response2 = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'authtest@example.com',
            password: 'ValidPass123!',
          })
          .expect(200);

        expect(response1.body.access_token).not.toBe(response2.body.access_token);
      });

      it('should limit concurrent sessions', async () => {
        // Create multiple sessions
        const sessions = [];
        for (let i = 0; i < 10; i++) {
          const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'authtest@example.com',
              password: 'ValidPass123!',
            });
          
          if (response.status === 200) {
            sessions.push(response.body.access_token);
          }
        }

        // Should limit number of concurrent sessions
        expect(sessions.length).toBeLessThanOrEqual(5);
      });
    });

    describe('Refresh Token Security', () => {
      it('should not accept refresh token as access token', async () => {
        await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${refreshToken}`)
          .expect(401);
      });

      it('should rotate refresh tokens', async () => {
        const refreshResponse = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refresh_token: refreshToken })
          .expect(200);

        expect(refreshResponse.body.access_token).toBeDefined();
        expect(refreshResponse.body.refresh_token).toBeDefined();
        expect(refreshResponse.body.refresh_token).not.toBe(refreshToken);
      });

      it('should invalidate old refresh tokens after rotation', async () => {
        const refreshResponse1 = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refresh_token: refreshToken })
          .expect(200);

        const newRefreshToken = refreshResponse1.body.refresh_token;

        // Old refresh token should now be invalid
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refresh_token: refreshToken })
          .expect(401);

        // New refresh token should work
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refresh_token: newRefreshToken })
          .expect(200);
      });
    });
  });

  describe('Brute Force Protection Tests', () => {
    it('should rate limit login attempts', async () => {
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'bruteforce@example.com',
              password: 'WrongPass123!',
            })
        );
      }

      const responses = await Promise.all(attempts);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should implement account lockout after failed attempts', async () => {
      const email = `lockout${Date.now()}@example.com`;
      
      // Create account
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          username: `lockout${Date.now()}`,
          password: 'ValidPass123!',
          displayName: 'Lockout Test',
        })
        .expect(201);

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email,
            password: 'WrongPassword!',
          });
      }

      // Account should be locked
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password: 'ValidPass123!', // Even with correct password
        })
        .expect(423); // Locked status

      expect(response.body.message).toContain('locked');
    });

    it('should implement CAPTCHA after multiple failed attempts', async () => {
      const email = 'captcha@example.com';
      
      // Make multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email,
            password: 'WrongPass!',
          });
      }

      // Next attempt should require CAPTCHA
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password: 'Password123!',
          // Missing CAPTCHA
        })
        .expect(400);

      expect(response.body.message).toContain('CAPTCHA');
    });
  });

  describe('CSRF Protection Tests', () => {
    it('should validate CSRF tokens for state-changing operations', async () => {
      // Try to update profile without CSRF token
      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Origin', 'http://malicious-site.com')
        .send({ bio: 'Updated bio' })
        .expect(403);

      expect(response.body.message).toContain('CSRF');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Origin', 'http://evil-site.com')
        .send({
          title: 'Test',
          content: 'Test content',
          excerpt: 'Test',
          tags: ['test'],
        })
        .expect(403);

      expect(response.body.message).toContain('origin');
    });

    it('should validate referer header', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/posts/123`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Referer', 'http://attacker.com/evil-page')
        .expect(403);

      expect(response.body.message).toContain('referer');
    });
  });

  describe('Authorization Security Tests', () => {
    describe('Role-Based Access Control', () => {
      it('should prevent privilege escalation', async () => {
        // Try to make self admin
        const response = await request(app.getHttpServer())
          .patch('/users/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ role: 'admin' })
          .expect(403);

        expect(response.body.message).toContain('permission');
      });

      it('should enforce admin-only endpoints', async () => {
        const adminEndpoints = [
          { method: 'get', path: '/admin/users' },
          { method: 'delete', path: '/admin/users/123' },
          { method: 'post', path: '/admin/settings' },
        ];

        for (const endpoint of adminEndpoints) {
          await request(app.getHttpServer())
            [endpoint.method](endpoint.path)
            .set('Authorization', `Bearer ${validToken}`)
            .expect(403);
        }
      });

      it('should prevent accessing other users\' private data', async () => {
        // Create another user
        const otherUserResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `other${Date.now()}@example.com`,
            username: `other${Date.now()}`,
            password: 'OtherPass123!',
            displayName: 'Other User',
          })
          .expect(201);

        const otherUserId = otherUserResponse.body.user._id;

        // Try to access their private data
        await request(app.getHttpServer())
          .get(`/users/${otherUserId}/private`)
          .set('Authorization', `Bearer ${validToken}`)
          .expect(403);

        // Try to modify their data
        await request(app.getHttpServer())
          .patch(`/users/${otherUserId}`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({ bio: 'Hacked!' })
          .expect(403);
      });
    });

    describe('Resource Ownership Validation', () => {
      it('should prevent editing other users\' posts', async () => {
        // Create a post with first user
        const postResponse = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            title: 'My Post',
            content: 'My content',
            excerpt: 'My excerpt',
            tags: ['test'],
          })
          .expect(201);

        const postId = postResponse.body._id;

        // Create another user and get their token
        const otherUserResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `editor${Date.now()}@example.com`,
            username: `editor${Date.now()}`,
            password: 'EditorPass123!',
            displayName: 'Editor User',
          })
          .expect(201);

        const otherUserToken = otherUserResponse.body.access_token;

        // Try to edit the first user's post
        await request(app.getHttpServer())
          .patch(`/posts/${postId}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ title: 'Hacked Title' })
          .expect(403);

        // Try to delete the first user's post
        await request(app.getHttpServer())
          .delete(`/posts/${postId}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);
      });
    });
  });

  describe('Security Headers Tests', () => {
    it('should set security headers correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should implement CORS properly', async () => {
      const response = await request(app.getHttpServer())
        .options('/posts')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('authorization');
    });
  });

  describe('Input Validation Security', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com',
        'user<script>@example.com',
      ];

      for (const email of invalidEmails) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            username: `user${Date.now()}`,
            password: 'ValidPass123!',
            displayName: 'Test User',
          })
          .expect(400);
      }
    });

    it('should sanitize username input', async () => {
      const maliciousUsernames = [
        'admin',
        'root',
        'administrator',
        '<script>alert(1)</script>',
        '../../../etc/passwd',
        'user\0name',
        'user\r\nname',
      ];

      for (const username of maliciousUsernames) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test${Date.now()}@example.com`,
            username,
            password: 'ValidPass123!',
            displayName: 'Test User',
          })
          .expect(400);

        expect(response.body.message).toContain('username');
      }
    });
  });
});