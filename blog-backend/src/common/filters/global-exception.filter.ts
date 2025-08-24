import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = (exceptionResponse as any).details || (exceptionResponse as any).errors;
      }
    } else if (exception instanceof MongoError) {
      // Handle MongoDB errors
      if (exception.code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'Duplicate key error';
        details = this.extractDuplicateKeyInfo(exception);
      } else {
        message = 'Database error';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Don't expose internal error details in production
      if (process.env.NODE_ENV !== 'production') {
        details = {
          name: exception.name,
          stack: exception.stack,
        };
      }
    }

    // Log the error
    this.logger.error(
      `Error ${status}: ${message}`,
      {
        exception,
        request: {
          method: request.method,
          url: request.url,
          body: request.body,
          user: (request as any).user,
        },
      },
    );

    // Send error response
    const errorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(status),
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(details && { details }),
      },
    };

    // In production, sanitize error messages
    if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.error.message = 'An error occurred while processing your request';
      delete errorResponse.error.details;
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const errorCodes: { [key: number]: string } = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }

  private extractDuplicateKeyInfo(error: MongoError): any {
    const match = error.message.match(/index: (.+) dup key: { (.+): "(.+)" }/);
    if (match) {
      return {
        field: match[2],
        value: match[3],
      };
    }
    return null;
  }
}