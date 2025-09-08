import { HttpStatus } from '@nestjs/common';
import { ErrorResponseUtil } from './error-response.util';

describe('ErrorResponseUtil', () => {
  describe('Error Detection Methods', () => {
    it('should detect not found errors', () => {
      const notFoundError = new Error('Resource not found');
      const otherError = new Error('Some other error');

      expect(ErrorResponseUtil.isNotFound(notFoundError)).toBe(true);
      expect(ErrorResponseUtil.isNotFound(otherError)).toBe(false);
    });

    it('should detect bad request errors', () => {
      const validationError = new Error('Validation failed');
      const requiredError = new Error('Field is required');
      const otherError = new Error('Some other error');

      expect(ErrorResponseUtil.isBadRequest(validationError)).toBe(true);
      expect(ErrorResponseUtil.isBadRequest(requiredError)).toBe(true);
      expect(ErrorResponseUtil.isBadRequest(otherError)).toBe(false);
    });

    it('should detect unauthorized errors', () => {
      const unauthorizedError = new Error('Unauthorized access');
      const credentialsError = new Error('Invalid credentials');
      const otherError = new Error('Some other error');

      expect(ErrorResponseUtil.isUnauthorized(unauthorizedError)).toBe(true);
      expect(ErrorResponseUtil.isUnauthorized(credentialsError)).toBe(true);
      expect(ErrorResponseUtil.isUnauthorized(otherError)).toBe(false);
    });

    it('should detect conflict errors', () => {
      const conflictError = new Error('Resource already exists');
      const verifiedError = new Error('Email already verified');
      const otherError = new Error('Some other error');

      expect(ErrorResponseUtil.isConflict(conflictError)).toBe(true);
      expect(ErrorResponseUtil.isConflict(verifiedError)).toBe(true);
      expect(ErrorResponseUtil.isConflict(otherError)).toBe(false);
    });
  });

  describe('Error Response Creation', () => {
    it('should create not found error response', () => {
      const error = new Error('Farm not found');
      const response = ErrorResponseUtil.notFound(error, 'Default message', 'FARM_NOT_FOUND');

      expect(response).toEqual({
        status: HttpStatus.NOT_FOUND,
        body: {
          errors: [
            {
              status: '404',
              title: 'Not Found',
              detail: 'Farm not found',
              code: 'FARM_NOT_FOUND',
            },
          ],
        },
      });
    });

    it('should create bad request error response', () => {
      const error = new Error('Invalid data');
      const response = ErrorResponseUtil.badRequest(error, 'Default message', 'INVALID_DATA');

      expect(response).toEqual({
        status: HttpStatus.BAD_REQUEST,
        body: {
          errors: [
            {
              status: '400',
              title: 'Bad Request',
              detail: 'Invalid data',
              code: 'INVALID_DATA',
            },
          ],
        },
      });
    });

    it('should create internal server error response', () => {
      const error = new Error('Database connection failed');
      const response = ErrorResponseUtil.internalServerError(error, 'Default message', 'DB_ERROR');

      expect(response).toEqual({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          errors: [
            {
              status: '500',
              title: 'Internal Server Error',
              detail: 'Database connection failed',
              code: 'DB_ERROR',
            },
          ],
        },
      });
    });

    it('should create no content response', () => {
      const response = ErrorResponseUtil.noContent();

      expect(response).toEqual({
        status: HttpStatus.NO_CONTENT,
        body: undefined,
      });
    });
  });

  describe('handleCommonError', () => {
    it('should handle not found error', () => {
      const error = new Error('User not found');
      const response = ErrorResponseUtil.handleCommonError(error, {
        notFoundMessage: 'User not found',
        notFoundCode: 'USER_NOT_FOUND',
      });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.errors[0].code).toBe('USER_NOT_FOUND');
    });

    it('should handle bad request error', () => {
      const error = new Error('Validation failed');
      const response = ErrorResponseUtil.handleCommonError(error, {
        badRequestMessage: 'Invalid input',
        badRequestCode: 'INVALID_INPUT',
      });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.errors[0].code).toBe('INVALID_INPUT');
    });

    it('should default to internal server error for unknown errors', () => {
      const error = new Error('Unknown error');
      const response = ErrorResponseUtil.handleCommonError(error, {
        internalErrorMessage: 'Something went wrong',
        internalErrorCode: 'UNKNOWN_ERROR',
      });

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.errors[0].code).toBe('UNKNOWN_ERROR');
    });
  });
});
