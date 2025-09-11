import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseUtil } from '../utils/error-response.util';

/**
 * Global exception filter that handles all unhandled exceptions
 * and provides consistent error responses across the API
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: any;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = this.handleHttpException(exception, request);
    } else if (this.isPrismaError(exception)) {
      const handled = this.handlePrismaError(exception, request);
      status = handled.status;
      errorResponse = handled.body;
    } else if (this.isValidationError(exception)) {
      const handled = this.handleValidationError(exception, request);
      status = handled.status;
      errorResponse = handled.body;
    } else {
      // Unknown error - treat as internal server error
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = this.handleUnknownError(exception, request);
    }

    // Log the error with context
    this.logError(exception, request, status);

    // Send the response
    response.status(status).json(errorResponse);
  }

  /**
   * Handle standard HTTP exceptions
   */
  private handleHttpException(exception: HttpException, request: Request): any {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    // Handle different HTTP exception types
    if (exception instanceof BadRequestException) {
      return ErrorResponseUtil.badRequest(
        exception,
        'Invalid request data',
        'INVALID_REQUEST'
      ).body;
    }
    
    if (exception instanceof UnauthorizedException) {
      return ErrorResponseUtil.unauthorized(
        exception,
        'Authentication required',
        'AUTHENTICATION_REQUIRED'
      ).body;
    }
    
    if (exception instanceof ForbiddenException) {
      return ErrorResponseUtil.forbidden(
        exception,
        'Access forbidden',
        'ACCESS_FORBIDDEN'
      ).body;
    }
    
    if (exception instanceof NotFoundException) {
      return ErrorResponseUtil.notFound(
        exception,
        'Resource not found',
        'RESOURCE_NOT_FOUND'
      ).body;
    }
    
    if (exception instanceof ConflictException) {
      return ErrorResponseUtil.conflict(
        exception,
        'Resource conflict',
        'RESOURCE_CONFLICT'
      ).body;
    }

    // Generic HTTP exception handling
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      return {
        errors: [{
          status: status.toString(),
          title: this.getHttpStatusText(status),
          detail: (exceptionResponse as any).message || exception.message,
          code: this.getErrorCode(status),
          source: {
            pointer: request.url
          }
        }]
      };
    }

    return {
      errors: [{
        status: status.toString(),
        title: this.getHttpStatusText(status),
        detail: exception.message,
        code: this.getErrorCode(status),
        source: {
          pointer: request.url
        }
      }]
    };
  }

  /**
   * Handle Prisma database errors
   */
  private handlePrismaError(exception: any, request: Request): { status: number; body: any } {
    const error = exception as any;
    
    // Prisma error codes
    if (error.code === 'P2002') {
      // Unique constraint violation
      return {
        status: HttpStatus.CONFLICT,
        body: {
          errors: [{
            status: '409',
            title: 'Conflict',
            detail: `Duplicate entry for ${error.meta?.target || 'field'}`,
            code: 'DUPLICATE_ENTRY',
            source: { pointer: request.url }
          }]
        }
      };
    }
    
    if (error.code === 'P2025') {
      // Record not found
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          errors: [{
            status: '404',
            title: 'Not Found',
            detail: 'The requested resource was not found',
            code: 'RESOURCE_NOT_FOUND',
            source: { pointer: request.url }
          }]
        }
      };
    }
    
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          errors: [{
            status: '400',
            title: 'Bad Request',
            detail: 'Referenced resource does not exist',
            code: 'FOREIGN_KEY_VIOLATION',
            source: { pointer: request.url }
          }]
        }
      };
    }

    // Generic database error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        errors: [{
          status: '500',
          title: 'Database Error',
          detail: 'A database error occurred',
          code: 'DATABASE_ERROR',
          source: { pointer: request.url }
        }]
      }
    };
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(exception: any, request: Request): { status: number; body: any } {
    const validationErrors = exception.response?.message || [];
    
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        errors: Array.isArray(validationErrors) 
          ? validationErrors.map((msg: string, index: number) => ({
              status: '400',
              title: 'Validation Error',
              detail: msg,
              code: 'VALIDATION_FAILED',
              source: { pointer: request.url },
              meta: { index }
            }))
          : [{
              status: '400',
              title: 'Validation Error',
              detail: typeof validationErrors === 'string' ? validationErrors : 'Validation failed',
              code: 'VALIDATION_FAILED',
              source: { pointer: request.url }
            }]
      }
    };
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(exception: unknown, request: Request): any {
    const error = exception as Error;
    
    return {
      errors: [{
        status: '500',
        title: 'Internal Server Error',
        detail: process.env.NODE_ENV === 'development' 
          ? error.message || 'An unexpected error occurred'
          : 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        source: { pointer: request.url }
      }]
    };
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(exception: unknown, request: Request, status: number): void {
    const error = exception as Error;
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = (request as any).user?.id || 'anonymous';
    
    const logContext = {
      method,
      url,
      ip,
      userAgent,
      userId,
      status,
      timestamp: new Date().toISOString()
    };

    if (status >= 500) {
      // Server errors - log with full stack trace
      this.logger.error(
        `Server Error: ${error.message}`,
        {
          ...logContext,
          stack: error.stack,
          error: process.env.NODE_ENV === 'development' ? exception : undefined
        }
      );
    } else if (status >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `Client Error: ${error.message}`,
        logContext
      );
    } else {
      // Other errors - log as debug
      this.logger.debug(
        `Request Error: ${error.message}`,
        logContext
      );
    }
  }

  /**
   * Check if error is a Prisma error
   */
  private isPrismaError(exception: unknown): boolean {
    return (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as any).code === 'string' &&
      (exception as any).code.startsWith('P')
    );
  }

  /**
   * Check if error is a validation error
   */
  private isValidationError(exception: unknown): boolean {
    return (
      exception &&
      typeof exception === 'object' &&
      'response' in exception &&
      typeof (exception as any).response === 'object' &&
      'statusCode' in (exception as any).response &&
      (exception as any).response.statusCode === 400
    );
  }

  /**
   * Get HTTP status text
   */
  private getHttpStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    
    return statusTexts[status] || 'Unknown Error';
  }

  /**
   * Get error code based on HTTP status
   */
  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
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
      504: 'GATEWAY_TIMEOUT'
    };
    
    return errorCodes[status] || 'UNKNOWN_ERROR';
  }
}