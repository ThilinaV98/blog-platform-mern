import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { 
  loginLimiter, 
  createAccountLimiter, 
  passwordResetLimiter,
  uploadLimiter 
} from './common/middleware/rate-limit.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", isProduction ? '' : "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:', isProduction ? '' : 'http://localhost:4000'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin access for images
  }));

  // Compression middleware
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Default compression filter
      return true;
    },
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
  }));

  // Enable sessions
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
      },
      name: 'sessionId', // Change default session name
    }),
  );

  // Apply rate limiters to specific routes
  app.use('/api/auth/register', createAccountLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/forgot-password', passwordResetLimiter);
  app.use('/api/auth/reset-password', passwordResetLimiter);
  app.use('/api/upload', uploadLimiter);

  // Enable CORS with strict settings
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5001'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe with security enhancements
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false, // Prevent type coercion attacks
      },
      disableErrorMessages: isProduction, // Hide detailed errors in production
      validationError: {
        target: false, // Don't expose target object
        value: false, // Don't expose submitted values
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Trust proxy for accurate IP addresses
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Blog Platform API')
    .setDescription('The Blog Platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  
  // Setup Swagger with authentication in production
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      ...(isProduction && {
        // Add basic auth for production Swagger
        authAction: {
          'Bearer': {
            name: 'Bearer',
            schema: {
              type: 'http',
              in: 'header',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            value: 'Bearer <JWT token here>'
          }
        }
      })
    },
    customSiteTitle: 'Blog Platform API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    customCssUrl: isProduction ? '/swagger-dark.css' : undefined,
  });

  // Graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);
      await app.close();
      process.exit(0);
    });
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (!isProduction) {
    logger.log(`📚 API Documentation available at: http://localhost:${port}/api-docs`);
  }
}
bootstrap();
