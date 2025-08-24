import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl: url, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`➤ ${method} ${url} - ${ip} - ${userAgent}`);

    // Log response details when request completes
    res.on('close', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const responseTime = Date.now() - startTime;
      
      // Determine log level based on status code
      const logMessage = `✓ ${method} ${url} ${statusCode} ${contentLength}b - ${responseTime}ms - ${ip}`;
      
      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}