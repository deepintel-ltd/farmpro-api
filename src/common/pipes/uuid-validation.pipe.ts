import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { createJsonApiError, createJsonApiErrorResponse } from '../utils/json-api-response.util';

/**
 * Pipe for validating UUID path parameters
 * Ensures all ID parameters are valid UUIDs
 */
@Injectable()
export class UuidValidationPipe implements PipeTransform {
  private readonly uuidSchema = z.string().uuid();

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'param') {
      return value;
    }

    // Only validate parameters that look like IDs
    if (metadata.data && metadata.data.includes('id')) {
      const result = this.uuidSchema.safeParse(value);
      
      if (!result.success) {
        const error = createJsonApiError('400', 'Invalid Resource ID', {
          code: 'INVALID_UUID',
          detail: `The provided ID '${value}' is not a valid UUID`,
          source: {
            parameter: metadata.data,
          },
        });
        
        throw new BadRequestException(createJsonApiErrorResponse([error]));
      }
    }

    return value;
  }
}

/**
 * Generic parameter validation pipe that can validate any parameter against a Zod schema
 */
@Injectable()
export class ParameterValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: z.ZodSchema,
    private readonly parameterName?: string,
  ) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'param') {
      return value;
    }

    // If parameterName is specified, only validate that specific parameter
    if (this.parameterName && metadata.data !== this.parameterName) {
      return value;
    }

    const result = this.schema.safeParse(value);
    
    if (!result.success) {
      const errors = result.error.errors.map((error) => 
        createJsonApiError('400', 'Invalid Parameter', {
          code: 'INVALID_PARAMETER',
          detail: error.message,
          source: {
            parameter: metadata.data || 'unknown',
          },
          meta: {
            zodErrorCode: error.code,
            received: value,
          },
        })
      );
      
      throw new BadRequestException(createJsonApiErrorResponse(errors));
    }

    return result.data;
  }
}

/**
 * Factory function to create a parameter validation pipe with a specific schema
 */
export function createParameterValidationPipe(schema: z.ZodSchema, parameterName?: string) {
  return new ParameterValidationPipe(schema, parameterName);
}
