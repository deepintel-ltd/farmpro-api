import { z } from 'zod';

/**
 * Type-safe contract validation utilities
 * These utilities ensure maximum type safety for frontend consumption
 */

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a valid UUID
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Type guard to check if a value is a valid ISO datetime string
 */
export function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Type guard to check if a value is a valid URL
 */
export function isUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a value is a valid email
 */
export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// =============================================================================
// Contract Type Utilities
// =============================================================================

/**
 * Extract the response type from a contract endpoint
 */
export type ExtractResponseType<T> = T extends {
  responses: infer R;
}
  ? R extends Record<number, infer V>
    ? V
    : never
  : never;

/**
 * Extract the request body type from a contract endpoint
 */
export type ExtractRequestBodyType<T> = T extends {
  body: infer B;
}
  ? B extends z.ZodType
    ? z.infer<B>
    : never
  : never;

/**
 * Extract the query parameters type from a contract endpoint
 */
export type ExtractQueryType<T> = T extends {
  query: infer Q;
}
  ? Q extends z.ZodType
    ? z.infer<Q>
    : never
  : never;

/**
 * Extract the path parameters type from a contract endpoint
 */
export type ExtractPathParamsType<T> = T extends {
  pathParams: infer P;
}
  ? P extends z.ZodType
    ? z.infer<P>
    : never
  : never;

// =============================================================================
// Runtime Validation Helpers
// =============================================================================

/**
 * Safe contract response validator
 * Validates API responses against contract schemas with proper error handling
 */
export function validateContractResponse<T extends z.ZodType>(
  schema: T,
  data: unknown,
  endpoint: string,
): { success: true; data: z.infer<T> } | { success: false; error: string; details: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: `Validation failed for ${endpoint}`,
    details: result.error,
  };
}

/**
 * Safe contract request validator
 * Validates request data against contract schemas
 */
export function validateContractRequest<T extends z.ZodType>(
  schema: T,
  data: unknown,
  endpoint: string,
): { success: true; data: z.infer<T> } | { success: false; error: string; details: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: `Request validation failed for ${endpoint}`,
    details: result.error,
  };
}

// =============================================================================
// Type-Safe Error Handling
// =============================================================================

/**
 * JSON API Error type with strict typing
 */
export interface JsonApiError {
  readonly id?: string | undefined;
  readonly status: string;
  readonly code?: string | undefined;
  readonly title: string;
  readonly detail?: string | undefined;
  readonly source?: {
    readonly pointer?: string | undefined;
    readonly parameter?: string | undefined;
    readonly header?: string | undefined;
  } | undefined;
  readonly meta?: Record<string, unknown> | undefined;
}

/**
 * Type-safe error response handler
 */
export function createErrorResponse(
  status: number,
  title: string,
  detail?: string,
  source?: JsonApiError['source'],
): { errors: JsonApiError[] } {
  return {
    errors: [
      {
        status: status.toString(),
        title,
        detail: detail ?? undefined,
        source: source ?? undefined,
      },
    ],
  };
}

// =============================================================================
// Contract Metadata Types
// =============================================================================

/**
 * Type-safe contract metadata
 */
export interface ContractMetadata {
  readonly version: string;
  readonly title: string;
  readonly description: string;
  readonly baseUrl: string;
  readonly endpoints: Record<string, string[]>;
  readonly schemas: Record<string, z.ZodType>;
}

/**
 * Type-safe endpoint metadata
 */
export interface EndpointMetadata {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly summary: string;
  readonly description?: string;
  readonly tags?: string[];
  readonly deprecated?: boolean;
}

// =============================================================================
// Frontend Integration Types
// =============================================================================

/**
 * Type-safe API client configuration
 */
export interface ApiClientConfig {
  readonly baseUrl: string;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly retries?: number;
  readonly validateResponses?: boolean;
}

/**
 * Type-safe API response wrapper
 */
export interface ApiResponse<T = unknown> {
  readonly data: T;
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly meta?: Record<string, unknown>;
}

/**
 * Type-safe API error wrapper
 */
export interface ApiError {
  readonly message: string;
  readonly status: number;
  readonly errors?: JsonApiError[];
  readonly details?: unknown;
}

// =============================================================================
// Utility Types for Frontend
// =============================================================================

/**
 * Extract all possible response status codes from a contract
 */
export type ExtractStatusCodes<T> = T extends {
  responses: infer R;
}
  ? R extends Record<infer K, unknown>
    ? K extends number
      ? K
      : never
    : never
  : never;

/**
 * Extract the success response type (2xx status codes)
 */
export type ExtractSuccessResponse<T> = T extends {
  responses: infer R;
}
  ? R extends Record<infer K, infer V>
    ? K extends 200 | 201 | 202 | 204
      ? V
      : never
    : never
  : never;

/**
 * Extract the error response type (4xx, 5xx status codes)
 */
export type ExtractErrorResponse<T> = T extends {
  responses: infer R;
}
  ? R extends Record<infer K, infer V>
    ? K extends 400 | 401 | 403 | 404 | 422 | 500
      ? V
      : never
    : never
  : never;

// =============================================================================
// Validation Schemas for Type Safety
// =============================================================================

/**
 * Strict UUID validation schema
 */
export const StrictUuidSchema = z.string().refine(isUuid, {
    error: 'Must be a valid UUID'
});

/**
 * Strict ISO datetime validation schema
 */
export const StrictIsoDateTimeSchema = z.string().refine(isIsoDateTime, {
    error: 'Must be a valid ISO datetime string'
});

/**
 * Strict URL validation schema
 */
export const StrictUrlSchema = z.string().refine(isUrl, {
    error: 'Must be a valid URL'
});

/**
 * Strict email validation schema
 */
export const StrictEmailSchema = z.string().refine(isEmail, {
    error: 'Must be a valid email address'
});

// =============================================================================
// Contract Compliance Checker
// =============================================================================

/**
 * Enhanced contract compliance checker with strict typing
 */
export class StrictContractValidator {
  /**
   * Validate that a response follows JSON API specification
   */
  static validateJsonApiStructure(data: unknown): data is {
    data: {
      id: string;
      type: string;
      attributes: Record<string, unknown>;
      relationships?: Record<string, unknown>;
    } | Array<{
      id: string;
      type: string;
      attributes: Record<string, unknown>;
      relationships?: Record<string, unknown>;
    }>;
    included?: Array<{
      id: string;
      type: string;
      attributes: Record<string, unknown>;
      relationships?: Record<string, unknown>;
    }>;
    meta?: Record<string, unknown>;
    links?: Record<string, string>;
  } {
    if (!data || typeof data !== 'object') return false;

    const jsonApiData = data as Record<string, unknown>;

    // Must have data property
    if (!('data' in jsonApiData)) return false;

    const dataValue = jsonApiData['data'];

    // If data is an object, it should have id, type, and attributes
    if (typeof dataValue === 'object' && dataValue !== null && !Array.isArray(dataValue)) {
      const dataObj = dataValue as Record<string, unknown>;
      return (
        typeof dataObj['id'] === 'string' &&
        typeof dataObj['type'] === 'string' &&
        typeof dataObj['attributes'] === 'object' &&
        dataObj['attributes'] !== null
      );
    }

    // If data is an array, each item should have id, type, and attributes
    if (Array.isArray(dataValue)) {
      return dataValue.every(
        (item: unknown) =>
          item &&
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>)['id'] === 'string' &&
          typeof (item as Record<string, unknown>)['type'] === 'string' &&
          typeof (item as Record<string, unknown>)['attributes'] === 'object' &&
          (item as Record<string, unknown>)['attributes'] !== null,
      );
    }

    return false;
  }

  /**
   * Validate include parameter against allowed relationships
   */
  static validateIncludeParameter(
    include: string,
    validIncludes: readonly string[],
  ): boolean {
    if (!include) return true;

    const includes = include.split(',').map((i) => i.trim());
    return includes.every((inc) => validIncludes.includes(inc));
  }

  /**
   * Validate sort parameter against allowed fields
   */
  static validateSortParameter(
    sort: string,
    validFields: readonly string[],
  ): boolean {
    if (!sort) return true;

    const sortFields = sort.split(',').map((s) => s.trim());
    return sortFields.every((field) => {
      const cleanField = field.startsWith('-') ? field.substring(1) : field;
      return validFields.includes(cleanField);
    });
  }

  /**
   * Validate field selection parameter
   */
  static validateFieldsParameter(
    fields: string,
    validFields: readonly string[],
  ): boolean {
    if (!fields) return true;

    const fieldList = fields.split(',').map((f) => f.trim());
    return fieldList.every((field) => validFields.includes(field));
  }
}
