import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { JsonApiQuerySchema } from '../../../contracts/schemas';
import { createJsonApiError, createJsonApiErrorResponse } from '../utils/json-api-response.util';

/**
 * Pipe for validating JSON API query parameters
 * Handles include, fields, sort, pagination, and filter parameters
 */
@Injectable()
export class JsonApiQueryPipe implements PipeTransform {
  constructor(
    private readonly options: {
      allowedIncludes?: string[];
      allowedSortFields?: string[];
      allowedFilters?: string[];
      maxPageSize?: number;
      defaultPageSize?: number;
    } = {},
  ) {
    this.options = {
      maxPageSize: 100,
      defaultPageSize: 20,
      ...options,
    };
  }

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'query') {
      return value;
    }

    // Parse and validate basic query structure
    const parseResult = JsonApiQuerySchema.safeParse(value);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((error) => 
        createJsonApiError('400', 'Invalid Query Parameter', {
          code: 'INVALID_QUERY_PARAMETER',
          detail: error.message,
          source: {
            parameter: error.path.join('.'),
          },
        })
      );
      
      throw new BadRequestException(createJsonApiErrorResponse(errors));
    }

    const query = parseResult.data;

    // Validate include parameter
    if (query.include) {
      this.validateIncludeParameter(query.include);
    }

    // Validate sort parameter
    if (query.sort) {
      this.validateSortParameter(query.sort);
    }

    // Validate filter parameters
    if (query.filter) {
      this.validateFilterParameters(query.filter);
    }

    // Apply pagination defaults
    const processedQuery = {
      ...query,
      'page[size]': query['page[size]'] || this.options.defaultPageSize,
      'page[number]': query['page[number]'] || 1,
    };

    // Validate page size limits
    if (processedQuery['page[size]'] > this.options.maxPageSize!) {
      const error = createJsonApiError('400', 'Invalid Page Size', {
        code: 'INVALID_PAGE_SIZE',
        detail: `Page size cannot exceed ${this.options.maxPageSize}`,
        source: {
          parameter: 'page[size]',
        },
      });
      
      throw new BadRequestException(createJsonApiErrorResponse([error]));
    }

    return processedQuery;
  }

  private validateIncludeParameter(include: string): void {
    if (!this.options.allowedIncludes) {
      return; // No restrictions
    }

    const includes = include.split(',').map(i => i.trim());
    const invalidIncludes = includes.filter(inc => !this.options.allowedIncludes!.includes(inc));

    if (invalidIncludes.length > 0) {
      const error = createJsonApiError('400', 'Invalid Include Parameter', {
        code: 'INVALID_INCLUDE',
        detail: `Invalid include values: ${invalidIncludes.join(', ')}. Allowed values: ${this.options.allowedIncludes!.join(', ')}`,
        source: {
          parameter: 'include',
        },
      });
      
      throw new BadRequestException(createJsonApiErrorResponse([error]));
    }
  }

  private validateSortParameter(sort: string): void {
    if (!this.options.allowedSortFields) {
      return; // No restrictions
    }

    const sortFields = sort.split(',').map(s => s.trim());
    const invalidFields = sortFields
      .map(field => field.startsWith('-') ? field.substring(1) : field)
      .filter(field => !this.options.allowedSortFields!.includes(field));

    if (invalidFields.length > 0) {
      const error = createJsonApiError('400', 'Invalid Sort Parameter', {
        code: 'INVALID_SORT',
        detail: `Invalid sort fields: ${invalidFields.join(', ')}. Allowed fields: ${this.options.allowedSortFields!.join(', ')}`,
        source: {
          parameter: 'sort',
        },
      });
      
      throw new BadRequestException(createJsonApiErrorResponse([error]));
    }
  }

  private validateFilterParameters(filters: Record<string, string>): void {
    if (!this.options.allowedFilters) {
      return; // No restrictions
    }

    const invalidFilters = Object.keys(filters).filter(filter => 
      !this.options.allowedFilters!.includes(filter)
    );

    if (invalidFilters.length > 0) {
      const error = createJsonApiError('400', 'Invalid Filter Parameter', {
        code: 'INVALID_FILTER',
        detail: `Invalid filter parameters: ${invalidFilters.join(', ')}. Allowed filters: ${this.options.allowedFilters!.join(', ')}`,
        source: {
          parameter: 'filter',
        },
      });
      
      throw new BadRequestException(createJsonApiErrorResponse([error]));
    }
  }
}

/**
 * Factory function to create JsonApiQueryPipe with specific options
 */
export function createJsonApiQueryPipe(options?: {
  allowedIncludes?: string[];
  allowedSortFields?: string[];
  allowedFilters?: string[];
  maxPageSize?: number;
  defaultPageSize?: number;
}) {
  return new JsonApiQueryPipe(options);
}
