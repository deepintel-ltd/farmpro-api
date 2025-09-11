import { JsonApiError, JsonApiErrorResponse } from '../../../contracts/schemas';

/**
 * JSON API response utility functions for formatting responses according to JSON API specification
 */

export interface JsonApiResourceData<T = any> {
  id: string;
  type: string;
  attributes: T;
  relationships?: Record<string, JsonApiRelationship>;
}

export interface JsonApiRelationship {
  data?: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
  links?: {
    self?: string;
    related?: string;
  };
  meta?: Record<string, any>;
}

export interface JsonApiResourceIdentifier {
  type: string;
  id: string;
}

export interface JsonApiLinks {
  self?: string;
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
  related?: string;
}

export interface JsonApiMeta {
  totalCount?: number;
  pageCount?: number;
  currentPage?: number;
  perPage?: number;
  [key: string]: any;
}

export interface JsonApiResponse<T = any> {
  data: JsonApiResourceData<T> | JsonApiResourceData<T>[];
  included?: JsonApiResourceData[];
  meta?: JsonApiMeta;
  links?: JsonApiLinks;
}

/**
 * Creates a JSON API compliant single resource response
 */
export function createJsonApiResource<T>(
  id: string,
  type: string,
  attributes: T,
  options: {
    relationships?: Record<string, JsonApiRelationship>;
    included?: JsonApiResourceData[];
    meta?: JsonApiMeta;
    links?: JsonApiLinks;
  } = {},
): JsonApiResponse<T> {
  const response: JsonApiResponse<T> = {
    data: {
      id,
      type,
      attributes,
      ...(options.relationships && { relationships: options.relationships }),
    },
  };

  if (options.included) {
    response.included = options.included;
  }

  if (options.meta) {
    response.meta = options.meta;
  }

  if (options.links) {
    response.links = options.links;
  }

  return response;
}

/**
 * Creates a JSON API compliant collection response
 */
export function createJsonApiCollection<T>(
  resources: Array<{
    id: string;
    type: string;
    attributes: T;
    relationships?: Record<string, JsonApiRelationship>;
  }>,
  options: {
    included?: JsonApiResourceData[];
    meta?: JsonApiMeta;
    links?: JsonApiLinks;
  } = {},
): JsonApiResponse<T> {
  const response: JsonApiResponse<T> = {
    data: resources.map((resource) => ({
      id: resource.id,
      type: resource.type,
      attributes: resource.attributes,
      ...(resource.relationships && { relationships: resource.relationships }),
    })),
  };

  if (options.included) {
    response.included = options.included;
  }

  if (options.meta) {
    response.meta = options.meta;
  }

  if (options.links) {
    response.links = options.links;
  }

  return response;
}

/**
 * Creates a JSON API compliant relationship response
 */
export function createJsonApiRelationship(
  data: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null,
  options: {
    links?: {
      self?: string;
      related?: string;
    };
    meta?: Record<string, any>;
  } = {},
): { data: typeof data; links?: typeof options.links; meta?: typeof options.meta } {
  const response: any = { data };

  if (options.links) {
    response.links = options.links;
  }

  if (options.meta) {
    response.meta = options.meta;
  }

  return response;
}

/**
 * Creates pagination links for JSON API responses
 */
export function createPaginationLinks(
  baseUrl: string,
  currentPage: number,
  totalPages: number,
  perPage: number,
  queryParams: Record<string, any> = {},
): JsonApiLinks {
  const createUrl = (page: number) => {
    const params = new URLSearchParams({
      ...queryParams,
      'page[number]': page.toString(),
      'page[size]': perPage.toString(),
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const links: JsonApiLinks = {
    self: createUrl(currentPage),
  };

  if (totalPages > 1) {
    links.first = createUrl(1);
    links.last = createUrl(totalPages);

    if (currentPage > 1) {
      links.prev = createUrl(currentPage - 1);
    }

    if (currentPage < totalPages) {
      links.next = createUrl(currentPage + 1);
    }
  }

  return links;
}

/**
 * Creates pagination meta information
 */
export function createPaginationMeta(
  totalCount: number,
  currentPage: number,
  perPage: number,
): JsonApiMeta {
  const totalPages = Math.ceil(totalCount / perPage);

  return {
    totalCount,
    pageCount: totalPages,
    currentPage,
    perPage,
  };
}

/**
 * Creates a JSON API compliant error response
 */
export function createJsonApiError(
  status: string,
  title: string,
  options: {
    id?: string;
    code?: string;
    detail?: string;
    source?: {
      pointer?: string;
      parameter?: string;
      header?: string;
    };
    meta?: Record<string, any>;
  } = {},
): JsonApiError {
  return {
    ...(options.id && { id: options.id }),
    status,
    ...(options.code && { code: options.code }),
    title,
    ...(options.detail && { detail: options.detail }),
    ...(options.source && { source: options.source }),
    ...(options.meta && { meta: options.meta }),
  };
}

/**
 * Creates a JSON API compliant error response with multiple errors
 */
export function createJsonApiErrorResponse(
  errors: JsonApiError[],
  options: {
    meta?: JsonApiMeta;
    links?: JsonApiLinks;
  } = {},
): JsonApiErrorResponse {
  const response: JsonApiErrorResponse = {
    errors,
  };

  if (options.meta) {
    response.meta = options.meta;
  }

  if (options.links) {
    response.links = options.links;
  }

  return response;
}

/**
 * Utility to extract resource type from class name or string
 */
export function getResourceType(resource: string | (() => any)): string {
  if (typeof resource === 'string') {
    return resource.toLowerCase();
  }

  const className = resource.name;
  // Convert PascalCase to kebab-case and pluralize
  return className
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .substring(1) + 's';
}

/**
 * Utility to build self link for a resource
 */
export function buildResourceSelfLink(baseUrl: string, type: string, id: string): string {
  return `${baseUrl}/${type}/${id}`;
}

/**
 * Utility to build relationship links
 */
export function buildRelationshipLinks(
  baseUrl: string,
  resourceType: string,
  resourceId: string,
  relationshipName: string,
): {
  self: string;
  related: string;
} {
  const resourceUrl = `${baseUrl}/${resourceType}/${resourceId}`;
  return {
    self: `${resourceUrl}/relationships/${relationshipName}`,
    related: `${resourceUrl}/${relationshipName}`,
  };
}
