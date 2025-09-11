import { z } from 'zod';
import { JsonApiErrorResponseSchema } from './schemas';

export { JsonApiErrorResponseSchema };

// Initialize ts-rest contract - used internally in each domain contract

// =============================================================================
// Common Query Parameters
// =============================================================================

export const CommonQueryParams = z.object({
  include: z.string().optional(),
  sort: z.string().optional(),
  'page[number]': z.coerce.number().int().positive().optional(),
  'page[size]': z.coerce.number().int().positive().max(100).optional(),
});

export const ResourceFieldsParams = z.object({
  'fields[farms]': z.string().optional(),
  'fields[commodities]': z.string().optional(),
  'fields[orders]': z.string().optional(),
  'fields[users]': z.string().optional(),
});

export const FilterParams = z.object({
  'filter[name]': z.string().optional(),
  'filter[category]': z.string().optional(),
  'filter[status]': z.string().optional(),
  'filter[orderType]': z.string().optional(),
  'filter[role]': z.string().optional(),
});

export const AllQueryParams =
  CommonQueryParams.merge(ResourceFieldsParams).merge(FilterParams);

// =============================================================================
// Common Response Schemas
// =============================================================================

export const CommonErrorResponses = {
  400: JsonApiErrorResponseSchema,
  404: JsonApiErrorResponseSchema,
  422: JsonApiErrorResponseSchema,
  500: JsonApiErrorResponseSchema,
} as const;

export const CollectionErrorResponses = {
  400: JsonApiErrorResponseSchema,
  500: JsonApiErrorResponseSchema,
} as const;

// =============================================================================
// Common Path Parameters
// =============================================================================

export const UuidPathParam = (resourceName: string) =>
  z.object({
    id: z.string().uuid(`${resourceName} ID must be a valid UUID`),
  });

// =============================================================================
// Contract Validation and Type Checking Utilities
// =============================================================================

/**
 * Utility to validate request body against contract schema
 */
export function validateRequestBody<T extends z.ZodType>(
  schema: T,
  data: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Utility to validate query parameters against contract schema
 */
export function validateQueryParams<T extends z.ZodType>(
  schema: T,
  params: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Utility to validate path parameters against contract schema
 */
export function validatePathParams<T extends z.ZodType>(
  schema: T,
  params: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Utility to validate response data against contract schema
 */
export function validateResponse<T extends z.ZodType>(
  schema: T,
  data: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Contract compliance checker utility
 */
export class ContractValidator {
  static validateJsonApiStructure(data: any): boolean {
    // Check if response follows JSON API structure
    if (!data || typeof data !== 'object') return false;

    // Must have data property
    if (!('data' in data)) return false;

    // If data is an object, it should have id, type, and attributes
    if (typeof data.data === 'object' && !Array.isArray(data.data)) {
      return (
        'id' in data.data && 'type' in data.data && 'attributes' in data.data
      );
    }

    // If data is an array, each item should have id, type, and attributes
    if (Array.isArray(data.data)) {
      return data.data.every(
        (item: any) =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          'type' in item &&
          'attributes' in item,
      );
    }

    return false;
  }

  static validateIncludeParameter(
    include: string,
    validIncludes: string[],
  ): boolean {
    if (!include) return true;

    const includes = include.split(',').map((i) => i.trim());
    return includes.every((inc) => validIncludes.includes(inc));
  }

  static validateSortParameter(sort: string, validFields: string[]): boolean {
    if (!sort) return true;

    const sortFields = sort.split(',').map((s) => s.trim());
    return sortFields.every((field) => {
      const cleanField = field.startsWith('-') ? field.substring(1) : field;
      return validFields.includes(cleanField);
    });
  }
}
