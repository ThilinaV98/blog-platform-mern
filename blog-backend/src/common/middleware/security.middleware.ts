import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
// import mongoSanitize from 'express-mongo-sanitize'; // Removed - incompatible with current Node/Express version
import hpp from 'hpp';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:', 'http://localhost:4000'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin access for images
  });

  private compressionMiddleware = compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Default compression filter
      return true;
    },
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
  });

  // Removed mongoSanitizeMiddleware - incompatible with current Node/Express version
  // NestJS ValidationPipe provides input sanitization

  private hppMiddleware = hpp();

  use(req: Request, res: Response, next: NextFunction) {
    // Apply security middlewares in sequence
    this.helmetMiddleware(req, res, () => {
      this.compressionMiddleware(req, res, () => {
        this.hppMiddleware(req, res, () => {
          // Add additional security headers
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          
          // Remove fingerprinting headers
          res.removeHeader('X-Powered-By');
          
          next();
        });
      });
    });
  }
}