import {
  createJsonApiResource,
  createJsonApiCollection,
  createJsonApiError,
  createJsonApiErrorResponse,
  createPaginationLinks,
  createPaginationMeta,
  getResourceType,
  buildResourceSelfLink,
  buildRelationshipLinks,
} from './json-api-response.util';

describe('JsonApiResponseUtil', () => {
  describe('createJsonApiResource', () => {
    it('should create a basic JSON API resource', () => {
      const resource = createJsonApiResource('123', 'farms', {
        name: 'Test Farm',
        size: 100,
      });

      expect(resource).toEqual({
        data: {
          id: '123',
          type: 'farms',
          attributes: {
            name: 'Test Farm',
            size: 100,
          },
        },
      });
    });

    it('should create a resource with relationships', () => {
      const resource = createJsonApiResource('123', 'farms', { name: 'Test Farm' }, {
        relationships: {
          owner: {
            data: { type: 'users', id: '456' },
          },
        },
      });

      expect((resource.data as any).relationships).toEqual({
        owner: {
          data: { type: 'users', id: '456' },
        },
      });
    });

    it('should create a resource with meta and links', () => {
      const resource = createJsonApiResource('123', 'farms', { name: 'Test Farm' }, {
        meta: { version: '1.0' },
        links: { self: '/farms/123' },
      });

      expect(resource.meta).toEqual({ version: '1.0' });
      expect(resource.links).toEqual({ self: '/farms/123' });
    });
  });

  describe('createJsonApiCollection', () => {
    it('should create a JSON API collection', () => {
      const collection = createJsonApiCollection([
        { id: '1', type: 'farms', attributes: { name: 'Farm 1' } },
        { id: '2', type: 'farms', attributes: { name: 'Farm 2' } },
      ]);

      expect(collection.data).toHaveLength(2);
      expect(collection.data[0]).toEqual({
        id: '1',
        type: 'farms',
        attributes: { name: 'Farm 1' },
      });
    });

    it('should create a collection with pagination meta', () => {
      const collection = createJsonApiCollection(
        [{ id: '1', type: 'farms', attributes: { name: 'Farm 1' } }],
        {
          meta: { totalCount: 100, currentPage: 1, perPage: 20 },
        },
      );

      expect(collection.meta).toEqual({
        totalCount: 100,
        currentPage: 1,
        perPage: 20,
      });
    });
  });

  describe('createJsonApiError', () => {
    it('should create a basic error', () => {
      const error = createJsonApiError('400', 'Bad Request');

      expect(error).toEqual({
        status: '400',
        title: 'Bad Request',
      });
    });

    it('should create an error with all optional fields', () => {
      const error = createJsonApiError('422', 'Validation Failed', {
        id: 'error-123',
        code: 'VALIDATION_ERROR',
        detail: 'Name is required',
        source: { pointer: '/data/attributes/name' },
        meta: { field: 'name' },
      });

      expect(error).toEqual({
        id: 'error-123',
        status: '422',
        code: 'VALIDATION_ERROR',
        title: 'Validation Failed',
        detail: 'Name is required',
        source: { pointer: '/data/attributes/name' },
        meta: { field: 'name' },
      });
    });
  });

  describe('createJsonApiErrorResponse', () => {
    it('should create an error response with multiple errors', () => {
      const errors = [
        createJsonApiError('400', 'Bad Request', { detail: 'Error 1' }),
        createJsonApiError('400', 'Bad Request', { detail: 'Error 2' }),
      ];

      const errorResponse = createJsonApiErrorResponse(errors);

      expect(errorResponse.errors).toHaveLength(2);
      expect(errorResponse.errors[0].detail).toBe('Error 1');
      expect(errorResponse.errors[1].detail).toBe('Error 2');
    });
  });

  describe('createPaginationLinks', () => {
    it('should create pagination links for first page', () => {
      const links = createPaginationLinks('/farms', 1, 5, 20);

      expect(links).toEqual({
        self: '/farms?page%5Bnumber%5D=1&page%5Bsize%5D=20',
        first: '/farms?page%5Bnumber%5D=1&page%5Bsize%5D=20',
        last: '/farms?page%5Bnumber%5D=5&page%5Bsize%5D=20',
        next: '/farms?page%5Bnumber%5D=2&page%5Bsize%5D=20',
      });
    });

    it('should create pagination links for middle page', () => {
      const links = createPaginationLinks('/farms', 3, 5, 20);

      expect(links).toEqual({
        self: '/farms?page%5Bnumber%5D=3&page%5Bsize%5D=20',
        first: '/farms?page%5Bnumber%5D=1&page%5Bsize%5D=20',
        last: '/farms?page%5Bnumber%5D=5&page%5Bsize%5D=20',
        prev: '/farms?page%5Bnumber%5D=2&page%5Bsize%5D=20',
        next: '/farms?page%5Bnumber%5D=4&page%5Bsize%5D=20',
      });
    });

    it('should create pagination links for last page', () => {
      const links = createPaginationLinks('/farms', 5, 5, 20);

      expect(links).toEqual({
        self: '/farms?page%5Bnumber%5D=5&page%5Bsize%5D=20',
        first: '/farms?page%5Bnumber%5D=1&page%5Bsize%5D=20',
        last: '/farms?page%5Bnumber%5D=5&page%5Bsize%5D=20',
        prev: '/farms?page%5Bnumber%5D=4&page%5Bsize%5D=20',
      });
    });

    it('should handle single page', () => {
      const links = createPaginationLinks('/farms', 1, 1, 20);

      expect(links).toEqual({
        self: '/farms?page%5Bnumber%5D=1&page%5Bsize%5D=20',
      });
    });
  });

  describe('createPaginationMeta', () => {
    it('should create pagination meta', () => {
      const meta = createPaginationMeta(100, 3, 20);

      expect(meta).toEqual({
        totalCount: 100,
        pageCount: 5,
        currentPage: 3,
        perPage: 20,
      });
    });

    it('should handle partial pages', () => {
      const meta = createPaginationMeta(95, 5, 20);

      expect(meta).toEqual({
        totalCount: 95,
        pageCount: 5,
        currentPage: 5,
        perPage: 20,
      });
    });
  });

  describe('getResourceType', () => {
    it('should convert string to lowercase', () => {
      expect(getResourceType('Farm')).toBe('farms');
    });

    it('should convert class name to pluralized kebab-case', () => {
      expect(getResourceType('FarmResource')).toBe('farm-resources');
    });

    it('should handle PascalCase class names', () => {
      expect(getResourceType('CommodityOrder')).toBe('commodity-orders');
    });
  });

  describe('buildResourceSelfLink', () => {
    it('should build a self link', () => {
      const link = buildResourceSelfLink('/api', 'farms', '123');
      expect(link).toBe('/api/farms/123');
    });
  });

  describe('buildRelationshipLinks', () => {
    it('should build relationship links', () => {
      const links = buildRelationshipLinks('/api', 'farms', '123', 'commodities');

      expect(links).toEqual({
        self: '/api/farms/123/relationships/commodities',
        related: '/api/farms/123/commodities',
      });
    });
  });
});
