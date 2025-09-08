import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { JsonApiExceptionFilter } from './json-api-exception.filter';

describe('JsonApiExceptionFilter', () => {
  let filter: JsonApiExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new JsonApiExceptionFilter();
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  describe('catch', () => {
    it('should handle HttpException and return JSON API error', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.api+json');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '400',
            title: 'Bad Request',
            detail: 'Test error',
          },
        ],
      });
    });

    it('should handle ZodError and return validation errors', () => {
      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'String must contain at least 1 character(s)',
          path: ['name'],
        },
      ]);

      filter.catch(zodError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '400',
            code: 'VALIDATION_ERROR',
            title: 'Validation Failed',
            detail: 'String must contain at least 1 character(s)',
            source: {
              pointer: '/data/attributes/name',
            },
            meta: {
              zodErrorCode: 'too_small',
              path: ['name'],
              received: undefined,
              expected: undefined,
            },
          },
        ],
      });
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '500',
            code: 'INTERNAL_ERROR',
            title: 'Internal Server Error',
            detail: 'An unexpected error occurred',
            meta: {
              errorName: 'Error',
            },
          },
        ],
      });
    });

    it('should handle unknown error', () => {
      const unknownError = 'string error';

      filter.catch(unknownError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '500',
            code: 'UNKNOWN_ERROR',
            title: 'Internal Server Error',
            detail: 'An unexpected error occurred',
            meta: {},
          },
        ],
      });
    });

    it('should handle HttpException with JSON API error response', () => {
      const jsonApiErrorResponse = {
        errors: [
          {
            status: '422',
            title: 'Validation Error',
            detail: 'Custom validation error',
          },
        ],
      };
      
      const exception = new HttpException(jsonApiErrorResponse, HttpStatus.UNPROCESSABLE_ENTITY);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(jsonApiErrorResponse);
    });

    it('should handle HttpException with validation message array', () => {
      const validationResponse = {
        message: ['Name is required', 'Age must be positive'],
        error: 'Bad Request',
        statusCode: 400,
      };
      
      const exception = new HttpException(validationResponse, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '400',
            code: 'VALIDATION_ERROR',
            title: 'Bad Request',
            detail: 'Name is required',
          },
          {
            status: '400',
            code: 'VALIDATION_ERROR',
            title: 'Bad Request',
            detail: 'Age must be positive',
          },
        ],
      });
    });
  });
});
