import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as rateLimit from 'express-rate-limit';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private limiter = rateLimit.rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}

// Specific rate limiters for sensitive endpoints
export const createAccountLimiter = rateLimit.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 create account requests per windowMs
  message: 'Too many accounts created from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

export const passwordResetLimiter = rateLimit.rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: 'Too many password reset requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 upload requests per windowMs
  message: 'Too many uploads from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});