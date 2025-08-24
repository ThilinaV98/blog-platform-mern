import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';

let mongod: MongoMemoryServer;

export async function createTestApp(): Promise<INestApplication> {
  // Start in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
        ignoreEnvFile: true,
        load: [
          () => ({
            database: {
              uri,
            },
            jwt: {
              secret: 'test-secret',
              expiresIn: '15m',
              refreshSecret: 'test-refresh-secret',
              refreshExpiresIn: '7d',
            },
            app: {
              port: 4001,
              cors: {
                origin: 'http://localhost:5001',
                credentials: true,
              },
            },
            upload: {
              maxFileSize: 5 * 1024 * 1024, // 5MB
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            },
          }),
        ],
      }),
      AppModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  
  // Apply the same configuration as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  app.enableCors({
    origin: 'http://localhost:5001',
    credentials: true,
  });

  await app.init();
  
  return app;
}

export async function closeTestApp(app: INestApplication) {
  await app.close();
  if (mongod) {
    await mongod.stop();
  }
}

// Test data factories
export const createTestUser = (overrides = {}) => ({
  email: 'test@example.com',
  username: 'testuser',
  password: 'Test123!@#',
  displayName: 'Test User',
  ...overrides,
});

export const createTestPost = (overrides = {}) => ({
  title: 'Test Post Title',
  content: '<p>This is test content for the blog post.</p>',
  excerpt: 'This is a test excerpt',
  category: 'Technology',
  tags: ['test', 'integration'],
  status: 'draft',
  featured: false,
  visibility: 'public',
  seo: {
    metaTitle: 'Test Post SEO Title',
    metaDescription: 'Test post SEO description',
  },
  ...overrides,
});

export const createLoginDto = (overrides = {}) => ({
  emailOrUsername: 'test@example.com',
  password: 'Test123!@#',
  ...overrides,
});