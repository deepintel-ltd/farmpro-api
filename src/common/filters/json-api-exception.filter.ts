import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { createJsonApiError, createJsonApiErrorResponse } from '../utils/json-api-response.util';

/**
 * Global exception filter that transforms all exceptions into JSON API compliant error responses
 */
@Catch()
export class JsonApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(JsonApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Set JSON API content type for error responses
    response.setHeader('Content-Type', 'application/vnd.api+json');

    // Log the exception for debugging
    this.logger.error('Exception caught by JsonApiExceptionFilter', {
      exception: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
      url: request.url,
      method: request.method,
    });

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      this.handleHttpException(exception, response);
    } else if (exception instanceof ZodError) {
      this.handleZodError(exception, response);
    } else if (exception instanceof PrismaClientKnownRequestError) {
      this.handlePrismaKnownError(exception, response);
    } else if (exception instanceof PrismaClientValidationError) {
      this.handlePrismaValidationError(exception, response);
    } else if (exception instanceof Error) {
      this.handleGenericError(exception, response);
    } else {
      this.handleUnknownError(exception, response);
    }
  }

  private handleHttpException(exception: HttpException, response: Response) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if the exception response is already a JSON API error response
    if (this.isJsonApiErrorResponse(exceptionResponse)) {
      response.status(status).json(exceptionResponse);
      return;
    }

    // Transform NestJS exception to JSON API format
    const title = this.getHttpStatusText(status);
    let detail = exception.message;
    let errors = [];

    // Handle validation errors from NestJS ValidationPipe
    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const responseObj = exceptionResponse as any;
      
      if (Array.isArray(responseObj.message)) {
        // Multiple validation errors
        errors = responseObj.message.map((msg: string) => 
          createJsonApiError(status.toString(), title, {
            code: 'VALIDATION_ERROR',
            detail: msg,
          })
        );
      } else {
        detail = responseObj.message;
      }
    }

    if (errors.length === 0) {
      errors = [createJsonApiError(status.toString(), title, { detail })];
    }

    const errorResponse = createJsonApiErrorResponse(errors);
    response.status(status).json(errorResponse);
  }

  private handleZodError(exception: ZodError, response: Response) {
    const errors = exception.issues.map((error) => {
      const pointer = this.buildJsonPointer(error.path.map(p => p.toString()));
      
      return createJsonApiError('400', 'Validation Failed', {
        code: 'VALIDATION_ERROR',
        detail: error.message,
        source: {
          pointer,
        },
        meta: {
          zodErrorCode: error.code,
          path: error.path,
          received: 'received' in error ? error.received : undefined,
          expected: 'expected' in error ? error.expected : undefined,
        },
      });
    });

    const errorResponse = createJsonApiErrorResponse(errors);
    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }

  private handlePrismaKnownError(exception: PrismaClientKnownRequestError, response: Response) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Database Error';
    let detail = exception.message;
    const code = exception.code;

    // Map Prisma error codes to appropriate HTTP status codes
    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        title = 'Unique Constraint Violation';
        detail = `A record with this ${exception.meta?.target} already exists`;
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        title = 'Record Not Found';
        detail = 'The requested record was not found';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        title = 'Foreign Key Constraint Violation';
        detail = 'Referenced record does not exist';
        break;
      case 'P2014':
        status = HttpStatus.BAD_REQUEST;
        title = 'Invalid Relationship';
        detail = 'The change would violate a required relation';
        break;
      case 'P2021':
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        title = 'Table Not Found';
        detail = 'Database table does not exist';
        break;
      case 'P2022':
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        title = 'Column Not Found';
        detail = 'Database column does not exist';
        break;
      default:
        // Keep default values
        break;
    }

    const error = createJsonApiError(status.toString(), title, {
      code: `PRISMA_${code}`,
      detail,
      meta: {
        prismaCode: exception.code,
        target: exception.meta?.target,
      },
    });

    const errorResponse = createJsonApiErrorResponse([error]);
    response.status(status).json(errorResponse);
  }

  private handlePrismaValidationError(exception: PrismaClientValidationError, response: Response) {
    const error = createJsonApiError('400', 'Database Validation Error', {
      code: 'PRISMA_VALIDATION_ERROR',
      detail: 'Invalid data provided to database operation',
      meta: {
        originalMessage: exception.message,
      },
    });

    const errorResponse = createJsonApiErrorResponse([error]);
    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }

  private handleGenericError(exception: Error, response: Response) {
    const error = createJsonApiError('500', 'Internal Server Error', {
      code: 'INTERNAL_ERROR',
      detail: 'An unexpected error occurred',
      meta: {
        errorName: exception.constructor.name,
        // Only include error message in development
        ...(process.env.NODE_ENV === 'development' && {
          originalMessage: exception.message,
        }),
      },
    });

    const errorResponse = createJsonApiErrorResponse([error]);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  private handleUnknownError(exception: unknown, response: Response) {
    const error = createJsonApiError('500', 'Internal Server Error', {
      code: 'UNKNOWN_ERROR',
      detail: 'An unexpected error occurred',
      meta: {
        // Only include error details in development
        ...(process.env.NODE_ENV === 'development' && {
          originalError: String(exception),
        }),
      },
    });

    const errorResponse = createJsonApiErrorResponse([error]);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }

  private isJsonApiErrorResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      'errors' in response &&
      Array.isArray(response.errors)
    );
  }

  private buildJsonPointer(path: (string | number)[]): string {
    // Build JSON Pointer according to RFC 6901
    const segments = path.map((segment) => {
      // Escape special characters in JSON Pointer
      return segment.toString().replace(/~/g, '~0').replace(/\//g, '~1');
    });

    return '/data/attributes' + (segments.length > 0 ? '/' + segments.join('/') : '');
  }

  private getHttpStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return statusTexts[status] || 'Unknown Error';
  }
}

/**
 * Specific exception filter for validation errors
 */
@Catch(ZodError)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ZodValidationExceptionFilter.name);

  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.setHeader('Content-Type', 'application/vnd.api+json');

    const errors = exception.issues.map((error) => {
      const pointer = this.buildJsonPointer(error.path.map(p => p.toString()));
      
      return createJsonApiError('400', 'Validation Failed', {
        code: 'VALIDATION_ERROR',
        detail: error.message,
        source: {
          pointer,
        },
        meta: {
          zodErrorCode: error.code,
          path: error.path,
        },
      });
    });

    const errorResponse = createJsonApiErrorResponse(errors);
    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }

  private buildJsonPointer(path: (string | number)[]): string {
    const segments = path.map((segment) => {
      return segment.toString().replace(/~/g, '~0').replace(/\//g, '~1');
    });

    return '/data/attributes' + (segments.length > 0 ? '/' + segments.join('/') : '');
  }
}
