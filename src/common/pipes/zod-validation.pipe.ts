import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { createJsonApiError, createJsonApiErrorResponse } from '../utils/json-api-response.util';

/**
 * NestJS pipe for validating request data against Zod schemas
 * Transforms Zod validation errors into JSON API compliant error responses
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const jsonApiErrors = this.transformZodErrorToJsonApi(error, metadata);
        const errorResponse = createJsonApiErrorResponse(jsonApiErrors);
        throw new BadRequestException(errorResponse);
      }
      throw error;
    }
  }

  private transformZodErrorToJsonApi(zodError: ZodError, metadata: ArgumentMetadata) {
    return zodError.errors.map((error) => {
      const pointer = this.buildJsonPointer(error.path, metadata);
      
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
  }

  private buildJsonPointer(path: (string | number)[], metadata: ArgumentMetadata): string {
    // Build JSON Pointer according to RFC 6901
    const segments = path.map((segment) => {
      // Escape special characters in JSON Pointer
      return segment.toString().replace(/~/g, '~0').replace(/\//g, '~1');
    });

    // Prefix with the appropriate root based on where the validation occurred
    let prefix = '';
    switch (metadata.type) {
      case 'body':
        prefix = '/data/attributes';
        break;
      case 'query':
        prefix = '/query';
        break;
      case 'param':
        prefix = '/params';
        break;
      default:
        prefix = '';
    }

    return prefix + (segments.length > 0 ? '/' + segments.join('/') : '');
  }
}

/**
 * Factory function to create a ZodValidationPipe with a specific schema
 */
export function createZodValidationPipe(schema: ZodSchema) {
  return new ZodValidationPipe(schema);
}

/**
 * Decorator to apply Zod validation to a parameter
 */
export function ZodValidate() {
  return function () {
    // This would be used with a custom parameter decorator
    // For now, we'll use the pipe directly in controllers
  };
}
