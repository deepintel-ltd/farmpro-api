import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ZodSchema } from 'zod';

/**
 * Interceptor to ensure all responses comply with JSON API specification
 * and match the expected contract schemas
 */
@Injectable()
export class JsonApiResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(JsonApiResponseInterceptor.name);

  constructor(
    private readonly responseSchema?: ZodSchema,
    private readonly options: {
      validateResponse?: boolean;
      logValidationErrors?: boolean;
      strictMode?: boolean;
    } = {},
  ) {
    this.options = {
      validateResponse: true,
      logValidationErrors: true,
      strictMode: false,
      ...options,
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    
    return next.handle().pipe(
      map((data) => {
        // Set JSON API content type
        response.setHeader('Content-Type', 'application/vnd.api+json');

        // Validate response against schema if provided
        if (this.responseSchema && this.options.validateResponse) {
          this.validateResponseData(data);
        }

        // Ensure JSON API structure compliance
        this.validateJsonApiStructure(data);

        return data;
      }),
    );
  }

  private validateResponseData(data: any): void {
    if (!this.responseSchema) return;

    try {
      this.responseSchema.parse(data);
    } catch (error) {
      if (this.options.logValidationErrors) {
        this.logger.error('Response validation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          data: JSON.stringify(data, null, 2),
        });
      }

      if (this.options.strictMode) {
        throw new Error(`Response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private validateJsonApiStructure(data: any): void {
    if (!data || typeof data !== 'object') {
      this.logStructureWarning('Response is not an object', data);
      return;
    }

    // Check for JSON API error response structure
    if ('errors' in data) {
      this.validateErrorStructure(data);
      return;
    }

    // Check for JSON API success response structure
    if (!('data' in data)) {
      this.logStructureWarning('Response missing required "data" property', data);
      return;
    }

    this.validateDataStructure(data.data);
    this.validateOptionalProperties(data);
  }

  private validateErrorStructure(data: any): void {
    if (!Array.isArray(data.errors)) {
      this.logStructureWarning('Errors property must be an array', data);
      return;
    }

    data.errors.forEach((error: any, index: number) => {
      if (!error || typeof error !== 'object') {
        this.logStructureWarning(`Error at index ${index} is not an object`, error);
        return;
      }

      if (!error.status || !error.title) {
        this.logStructureWarning(
          `Error at index ${index} missing required properties (status, title)`,
          error,
        );
      }
    });
  }

  private validateDataStructure(data: any): void {
    if (Array.isArray(data)) {
      // Collection response
      data.forEach((item: any, index: number) => {
        this.validateResourceObject(item, `data[${index}]`);
      });
    } else if (data && typeof data === 'object') {
      // Single resource response
      this.validateResourceObject(data, 'data');
    } else if (data !== null) {
      this.logStructureWarning('Data property must be an object, array, or null', data);
    }
  }

  private validateResourceObject(resource: any, path: string): void {
    if (!resource || typeof resource !== 'object') {
      this.logStructureWarning(`${path} is not an object`, resource);
      return;
    }

    const requiredProperties = ['id', 'type', 'attributes'];
    const missingProperties = requiredProperties.filter(prop => !(prop in resource));

    if (missingProperties.length > 0) {
      this.logStructureWarning(
        `${path} missing required properties: ${missingProperties.join(', ')}`,
        resource,
      );
    }

    // Validate relationships structure if present
    if ('relationships' in resource && resource.relationships) {
      this.validateRelationshipsStructure(resource.relationships, `${path}.relationships`);
    }
  }

  private validateRelationshipsStructure(relationships: any, path: string): void {
    if (typeof relationships !== 'object') {
      this.logStructureWarning(`${path} must be an object`, relationships);
      return;
    }

    Object.entries(relationships).forEach(([key, relationship]) => {
      this.validateRelationshipObject(relationship, `${path}.${key}`);
    });
  }

  private validateRelationshipObject(relationship: any, path: string): void {
    if (!relationship || typeof relationship !== 'object') {
      this.logStructureWarning(`${path} is not an object`, relationship);
      return;
    }

    // Relationship must have at least one of: data, links, meta
    const hasValidProperty = 'data' in relationship || 'links' in relationship || 'meta' in relationship;
    
    if (!hasValidProperty) {
      this.logStructureWarning(
        `${path} must contain at least one of: data, links, meta`,
        relationship,
      );
    }

    // Validate data structure if present
    if ('data' in relationship) {
      this.validateRelationshipData(relationship.data, `${path}.data`);
    }
  }

  private validateRelationshipData(data: any, path: string): void {
    if (data === null) {
      return; // null is valid for to-one relationships
    }

    if (Array.isArray(data)) {
      // to-many relationship
      data.forEach((item: any, index: number) => {
        this.validateResourceIdentifier(item, `${path}[${index}]`);
      });
    } else if (data && typeof data === 'object') {
      // to-one relationship
      this.validateResourceIdentifier(data, path);
    } else {
      this.logStructureWarning(`${path} must be null, object, or array`, data);
    }
  }

  private validateResourceIdentifier(identifier: any, path: string): void {
    if (!identifier || typeof identifier !== 'object') {
      this.logStructureWarning(`${path} is not an object`, identifier);
      return;
    }

    if (!identifier.type || !identifier.id) {
      this.logStructureWarning(
        `${path} missing required properties: type, id`,
        identifier,
      );
    }
  }

  private validateOptionalProperties(data: any): void {
    // Validate included array if present
    if ('included' in data && data.included !== undefined) {
      if (!Array.isArray(data.included)) {
        this.logStructureWarning('Included property must be an array', data.included);
      } else {
        data.included.forEach((item: any, index: number) => {
          this.validateResourceObject(item, `included[${index}]`);
        });
      }
    }

    // Validate meta object if present
    if ('meta' in data && data.meta !== undefined) {
      if (typeof data.meta !== 'object' || data.meta === null) {
        this.logStructureWarning('Meta property must be an object', data.meta);
      }
    }

    // Validate links object if present
    if ('links' in data && data.links !== undefined) {
      if (typeof data.links !== 'object' || data.links === null) {
        this.logStructureWarning('Links property must be an object', data.links);
      }
    }
  }

  private logStructureWarning(message: string, data: any): void {
    if (this.options.logValidationErrors) {
      this.logger.warn(`JSON API structure validation: ${message}`, {
        data: JSON.stringify(data, null, 2),
      });
    }

    if (this.options.strictMode) {
      throw new Error(`JSON API structure validation failed: ${message}`);
    }
  }
}

/**
 * Factory function to create a JsonApiResponseInterceptor with specific schema
 */
export function createJsonApiResponseInterceptor(
  responseSchema?: ZodSchema,
  options?: {
    validateResponse?: boolean;
    logValidationErrors?: boolean;
    strictMode?: boolean;
  },
) {
  return new JsonApiResponseInterceptor(responseSchema, options);
}
