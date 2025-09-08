import { HttpStatus } from '@nestjs/common';

export interface ErrorResponse {
  status: string;
  title: string;
  detail: string;
  code: string;
}

export interface ApiErrorResponse {
  status: 400 | 401 | 404 | 409 | 500;
  body: {
    errors: ErrorResponse[];
  };
}

export class ErrorResponseUtil {
  /**
   * Check if error is a not found error
   */
  static isNotFound(error: unknown): boolean {
    return error instanceof Error && 
           (error.message.includes('not found') || 
            error.message.includes('Not found') ||
            error.message.includes('does not exist'));
  }

  /**
   * Check if error is a validation/bad request error
   */
  static isBadRequest(error: unknown): boolean {
    return error instanceof Error && 
           (error.message.includes('validation') || 
            error.message.includes('required') ||
            error.message.includes('invalid') ||
            error.message.includes('Invalid'));
  }

  /**
   * Check if error is an unauthorized error
   */
  static isUnauthorized(error: unknown): boolean {
    return error instanceof Error && 
           (error.message.includes('unauthorized') || 
            error.message.includes('Unauthorized') ||
            error.message.includes('Invalid credentials') ||
            error.message.includes('disabled'));
  }

  /**
   * Check if error is a conflict error
   */
  static isConflict(error: unknown): boolean {
    return error instanceof Error && 
           (error.message.includes('already exists') || 
            error.message.includes('already verified') ||
            error.message.includes('conflict') ||
            error.message.includes('Conflict'));
  }

  /**
   * Create a not found error response
   */
  static notFound(error: unknown, defaultMessage: string, code: string): ApiErrorResponse {
    return {
      status: 404 as const,
      body: {
        errors: [
          {
            status: '404',
            title: 'Not Found',
            detail: (error as Error).message || defaultMessage,
            code,
          },
        ],
      },
    };
  }

  /**
   * Create a bad request error response
   */
  static badRequest(error: unknown, defaultMessage: string, code: string): ApiErrorResponse {
    return {
      status: 400 as const,
      body: {
        errors: [
          {
            status: '400',
            title: 'Bad Request',
            detail: (error as Error).message || defaultMessage,
            code,
          },
        ],
      },
    };
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(error: unknown, defaultMessage: string, code: string): ApiErrorResponse {
    return {
      status: 401 as const,
      body: {
        errors: [
          {
            status: '401',
            title: 'Unauthorized',
            detail: (error as Error).message || defaultMessage,
            code,
          },
        ],
      },
    };
  }

  /**
   * Create a conflict error response
   */
  static conflict(error: unknown, defaultMessage: string, code: string): ApiErrorResponse {
    return {
      status: 409 as const,
      body: {
        errors: [
          {
            status: '409',
            title: 'Conflict',
            detail: (error as Error).message || defaultMessage,
            code,
          },
        ],
      },
    };
  }

  /**
   * Create an internal server error response
   */
  static internalServerError(error: unknown, defaultMessage: string, code: string): ApiErrorResponse {
    return {
      status: 500 as const,
      body: {
        errors: [
          {
            status: '500',
            title: 'Internal Server Error',
            detail: (error as Error).message || defaultMessage,
            code,
          },
        ],
      },
    };
  }

  /**
   * Handle common error patterns and return appropriate response
   */
  static handleCommonError(
    error: unknown,
    context: {
      notFoundMessage?: string;
      notFoundCode?: string;
      badRequestMessage?: string;
      badRequestCode?: string;
      unauthorizedMessage?: string;
      unauthorizedCode?: string;
      conflictMessage?: string;
      conflictCode?: string;
      internalErrorMessage?: string;
      internalErrorCode?: string;
    }
  ): ApiErrorResponse {
    if (this.isNotFound(error)) {
      return this.notFound(
        error,
        context.notFoundMessage || 'Resource not found',
        context.notFoundCode || 'RESOURCE_NOT_FOUND'
      );
    }

    if (this.isBadRequest(error)) {
      return this.badRequest(
        error,
        context.badRequestMessage || 'Invalid request data',
        context.badRequestCode || 'INVALID_REQUEST_DATA'
      );
    }

    if (this.isUnauthorized(error)) {
      return this.unauthorized(
        error,
        context.unauthorizedMessage || 'Authentication failed',
        context.unauthorizedCode || 'AUTHENTICATION_FAILED'
      );
    }

    if (this.isConflict(error)) {
      return this.conflict(
        error,
        context.conflictMessage || 'Resource conflict',
        context.conflictCode || 'RESOURCE_CONFLICT'
      );
    }

    // Default to internal server error
    return this.internalServerError(
      error,
      context.internalErrorMessage || 'An unexpected error occurred',
      context.internalErrorCode || 'INTERNAL_SERVER_ERROR'
    );
  }

  /**
   * Create a success response with no body (for DELETE operations)
   */
  static noContent(): { status: 204; body: undefined } {
    return {
      status: 204 as const,
      body: undefined,
    };
  }
}
