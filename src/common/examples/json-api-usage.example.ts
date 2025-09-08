/**
 * Example demonstrating how to use the JSON API utilities, pipes, and filters
 * This file shows practical usage patterns for the implemented components
 */

import { Controller, Get, Post, Body, Param, Query, UseFilters, UseInterceptors, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import {
  createJsonApiResource,
  createJsonApiCollection,
  createPaginationLinks,
  createPaginationMeta,
  ZodValidationPipe,
  JsonApiQueryPipe,
  UuidValidationPipe,
  JsonApiResponseInterceptor,
  JsonApiExceptionFilter,
} from '../index';
import { FarmSchema, CreateFarmRequestSchema } from '../../../contracts';

// Example controller showing how to use all the utilities together
@Controller('farms')
@UseFilters(JsonApiExceptionFilter)
@UseInterceptors(JsonApiResponseInterceptor)
export class FarmsExampleController {
  
  /**
   * GET /farms - List farms with JSON API query parameters
   */
  @Get()
  @UsePipes(new JsonApiQueryPipe({
    allowedIncludes: ['owner', 'commodities'],
    allowedSortFields: ['name', 'size', 'establishedDate'],
    allowedFilters: ['name', 'cropTypes'],
    maxPageSize: 50,
    defaultPageSize: 20,
  }))
  async getFarms(@Query() query: any) {
    // Simulate database query with pagination
    const farms = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Green Valley Farm',
        size: 150,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Farm Road, Valley, NY 12345'
        },
        cropTypes: ['corn', 'soybeans'],
        establishedDate: '2010-05-15T00:00:00Z',
        certifications: ['organic', 'non-gmo']
      },
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Sunrise Acres',
        size: 200,
        location: {
          latitude: 41.8781,
          longitude: -87.6298,
          address: '456 Sunrise Lane, Acres, IL 60601'
        },
        cropTypes: ['wheat', 'barley'],
        establishedDate: '2008-03-20T00:00:00Z',
        certifications: ['sustainable']
      }
    ];

    // Create JSON API collection response
    const jsonApiResponse = createJsonApiCollection(
      farms.map(farm => ({
        id: farm.id,
        type: 'farms',
        attributes: farm,
        relationships: {
          owner: {
            data: { type: 'users', id: 'user-123' }
          }
        }
      })),
      {
        meta: createPaginationMeta(100, query['page[number]'] || 1, query['page[size]'] || 20),
        links: createPaginationLinks(
          '/farms',
          query['page[number]'] || 1,
          5, // total pages
          query['page[size]'] || 20,
          { include: query.include, sort: query.sort }
        )
      }
    );

    return jsonApiResponse;
  }

  /**
   * GET /farms/:id - Get single farm with UUID validation
   */
  @Get(':id')
  @UsePipes(UuidValidationPipe)
  async getFarm(@Param('id') id: string, @Query() query: any) {
    // Simulate database lookup
    const farm = {
      id,
      name: 'Green Valley Farm',
      size: 150,
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Farm Road, Valley, NY 12345'
      },
      cropTypes: ['corn', 'soybeans'],
      establishedDate: '2010-05-15T00:00:00Z',
      certifications: ['organic', 'non-gmo']
    };

    // Create JSON API resource response
    const jsonApiResponse = createJsonApiResource(
      farm.id,
      'farms',
      farm,
      {
        relationships: {
          owner: {
            data: { type: 'users', id: 'user-123' },
            links: {
              self: `/farms/${id}/relationships/owner`,
              related: `/farms/${id}/owner`
            }
          },
          commodities: {
            data: [
              { type: 'commodities', id: 'commodity-1' },
              { type: 'commodities', id: 'commodity-2' }
            ],
            links: {
              self: `/farms/${id}/relationships/commodities`,
              related: `/farms/${id}/commodities`
            }
          }
        },
        links: {
          self: `/farms/${id}`
        }
      }
    );

    return jsonApiResponse;
  }

  /**
   * POST /farms - Create farm with request validation
   */
  @Post()
  @UsePipes(new ZodValidationPipe(CreateFarmRequestSchema))
  async createFarm(@Body() createFarmRequest: z.infer<typeof CreateFarmRequestSchema>) {
    // Extract attributes from JSON API request
    const farmData = createFarmRequest.data.attributes;
    
    // Simulate database creation
    const newFarm = {
      id: '789e0123-e89b-12d3-a456-426614174002',
      ...farmData
    };

    // Create JSON API resource response
    const jsonApiResponse = createJsonApiResource(
      newFarm.id,
      'farms',
      newFarm,
      {
        links: {
          self: `/farms/${newFarm.id}`
        }
      }
    );

    return jsonApiResponse;
  }
}

/**
 * Example service showing how to use utilities in business logic
 */
export class FarmService {
  
  /**
   * Example method showing how to build relationships
   */
  async getFarmWithRelationships(farmId: string, include?: string) {
    // Simulate database query
    const farm = {
      id: farmId,
      name: 'Example Farm',
      size: 100,
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Example Road'
      },
      cropTypes: ['corn'],
      establishedDate: '2020-01-01T00:00:00Z'
    };

    const included: any[] = [];
    const relationships: any = {};

    // Handle include parameter
    if (include) {
      const includes = include.split(',');
      
      if (includes.includes('owner')) {
        const owner = {
          id: 'user-123',
          email: 'farmer@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'farmer' as const
        };
        
        included.push({
          id: owner.id,
          type: 'users',
          attributes: owner
        });
        
        relationships.owner = {
          data: { type: 'users', id: owner.id }
        };
      }

      if (includes.includes('commodities')) {
        const commodities = [
          {
            id: 'commodity-1',
            name: 'Corn',
            category: 'grain' as const,
            qualityGrade: 'premium' as const,
            quantity: 1000,
            unit: 'bushel' as const,
            harvestDate: '2023-09-15T00:00:00Z',
            storageLocation: 'Silo A'
          }
        ];
        
        commodities.forEach(commodity => {
          included.push({
            id: commodity.id,
            type: 'commodities',
            attributes: commodity
          });
        });
        
        relationships.commodities = {
          data: commodities.map(c => ({ type: 'commodities', id: c.id }))
        };
      }
    }

    return createJsonApiResource(
      farm.id,
      'farms',
      farm,
      {
        relationships,
        included: included.length > 0 ? included : undefined,
        links: {
          self: `/farms/${farm.id}`
        }
      }
    );
  }

  /**
   * Example method showing pagination handling
   */
  async getFarmsPaginated(page: number = 1, pageSize: number = 20, filters?: any) {
    // Simulate database query with filters and pagination
    const totalCount = 150;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Mock farms data
    const farms = Array.from({ length: pageSize }, (_, index) => ({
      id: `farm-${(page - 1) * pageSize + index + 1}`,
      name: `Farm ${(page - 1) * pageSize + index + 1}`,
      size: 100 + index * 10,
      location: {
        latitude: 40.7128 + index * 0.01,
        longitude: -74.0060 + index * 0.01,
        address: `${index + 1} Farm Road`
      },
      cropTypes: ['corn', 'soybeans'],
      establishedDate: '2020-01-01T00:00:00Z'
    }));

    return createJsonApiCollection(
      farms.map(farm => ({
        id: farm.id,
        type: 'farms',
        attributes: farm
      })),
      {
        meta: createPaginationMeta(totalCount, page, pageSize),
        links: createPaginationLinks('/farms', page, totalPages, pageSize, filters)
      }
    );
  }
}

/**
 * Example showing how to create custom validation pipes
 */
export class CustomFarmValidationPipe extends ZodValidationPipe {
  constructor() {
    // Custom schema with additional business rules
    const customFarmSchema = FarmSchema.refine(
      (data) => {
        // Business rule: Organic farms must be at least 50 acres
        if (data.certifications?.includes('organic') && data.size < 50) {
          return false;
        }
        return true;
      },
      {
        message: 'Organic farms must be at least 50 acres',
        path: ['size']
      }
    );

    super(customFarmSchema);
  }
}

/**
 * Example showing how to create custom interceptors
 */
export class CustomJsonApiInterceptor extends JsonApiResponseInterceptor {
  constructor() {
    super(undefined, {
      validateResponse: true,
      logValidationErrors: true,
      strictMode: false
    });
  }
}

/**
 * Usage examples for testing and development
 */
export const examples = {
  // Example of creating a simple resource response
  simpleResource: () => createJsonApiResource(
    '123',
    'farms',
    { name: 'Test Farm', size: 100 }
  ),

  // Example of creating a collection with pagination
  paginatedCollection: () => createJsonApiCollection(
    [
      { id: '1', type: 'farms', attributes: { name: 'Farm 1' } },
      { id: '2', type: 'farms', attributes: { name: 'Farm 2' } }
    ],
    {
      meta: createPaginationMeta(50, 1, 20),
      links: createPaginationLinks('/farms', 1, 3, 20)
    }
  ),

  // Example of creating an error response
  validationError: () => {
    const zodError = new z.ZodError([
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'Name is required',
        path: ['name']
      }
    ]);

    // This would be handled automatically by the exception filter
    return zodError;
  }
};
