# JSON API Utilities for NestJS

This module provides comprehensive utilities for building JSON API compliant NestJS applications with strong typing using Zod schemas and ts-rest contracts.

## Features

- ✅ JSON API response formatting utilities
- ✅ NestJS validation pipes for Zod schemas
- ✅ Response interceptors for contract compliance
- ✅ Global exception filters for JSON API error formatting
- ✅ Comprehensive error handling with proper status codes
- ✅ Pagination support with links and meta
- ✅ Relationship handling
- ✅ Full TypeScript support

## Quick Start

### 1. Basic Usage in Controllers

```typescript
import { Controller, Get, Post, Body, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  createJsonApiResource,
  createJsonApiCollection,
  ZodValidationPipe,
  JsonApiResponseInterceptor,
  JsonApiExceptionFilter,
} from '@/common';
import { FarmSchema } from '@/contracts/schemas';

@Controller('farms')
@UseFilters(JsonApiExceptionFilter)
@UseInterceptors(JsonApiResponseInterceptor)
export class FarmsController {
  
  @Get()
  async getFarms() {
    const farms = [/* your farm data */];
    
    return createJsonApiCollection(
      farms.map(farm => ({
        id: farm.id,
        type: 'farms',
        attributes: farm
      }))
    );
  }

  @Post()
  @UsePipes(new ZodValidationPipe(FarmSchema))
  async createFarm(@Body() farmData: any) {
    const newFarm = /* create farm logic */;
    
    return createJsonApiResource(
      newFarm.id,
      'farms',
      newFarm
    );
  }
}
```

### 2. Global Setup

Add the global exception filter to your main application:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { JsonApiExceptionFilter } from '@/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply global JSON API exception filter
  app.useGlobalFilters(new JsonApiExceptionFilter());
  
  await app.listen(3000);
}
bootstrap();
```

## Components

### Response Utilities

#### `createJsonApiResource(id, type, attributes, options?)`

Creates a JSON API compliant single resource response.

```typescript
const response = createJsonApiResource('123', 'farms', {
  name: 'Green Valley Farm',
  size: 150
}, {
  relationships: {
    owner: {
      data: { type: 'users', id: '456' }
    }
  },
  links: {
    self: '/farms/123'
  }
});
```

#### `createJsonApiCollection(resources, options?)`

Creates a JSON API compliant collection response.

```typescript
const response = createJsonApiCollection([
  { id: '1', type: 'farms', attributes: { name: 'Farm 1' } },
  { id: '2', type: 'farms', attributes: { name: 'Farm 2' } }
], {
  meta: createPaginationMeta(100, 1, 20),
  links: createPaginationLinks('/farms', 1, 5, 20)
});
```

#### `createJsonApiError(status, title, options?)`

Creates a JSON API compliant error object.

```typescript
const error = createJsonApiError('400', 'Validation Failed', {
  code: 'VALIDATION_ERROR',
  detail: 'Name is required',
  source: { pointer: '/data/attributes/name' }
});
```

### Validation Pipes

#### `ZodValidationPipe`

Validates request data against Zod schemas and returns JSON API error responses.

```typescript
@Post()
@UsePipes(new ZodValidationPipe(CreateFarmRequestSchema))
async createFarm(@Body() data: CreateFarmRequest) {
  // data is now validated and typed
}
```

#### `JsonApiQueryPipe`

Validates and processes JSON API query parameters (include, sort, pagination, filters).

```typescript
@Get()
@UsePipes(new JsonApiQueryPipe({
  allowedIncludes: ['owner', 'commodities'],
  allowedSortFields: ['name', 'size'],
  maxPageSize: 50
}))
async getFarms(@Query() query: JsonApiQuery) {
  // query parameters are validated
}
```

#### `UuidValidationPipe`

Validates UUID path parameters.

```typescript
@Get(':id')
@UsePipes(UuidValidationPipe)
async getFarm(@Param('id') id: string) {
  // id is guaranteed to be a valid UUID
}
```

### Interceptors

#### `JsonApiResponseInterceptor`

Ensures all responses comply with JSON API specification and validates against schemas.

```typescript
@Controller('farms')
@UseInterceptors(new JsonApiResponseInterceptor(FarmResourceSchema, {
  validateResponse: true,
  strictMode: false
}))
export class FarmsController {
  // All responses will be validated
}
```

### Exception Filters

#### `JsonApiExceptionFilter`

Global exception filter that transforms all exceptions into JSON API compliant error responses.

Handles:
- HTTP exceptions
- Zod validation errors
- Prisma database errors
- Generic errors
- Unknown errors

```typescript
// Automatically transforms this:
throw new BadRequestException('Invalid data');

// Into this JSON API response:
{
  "errors": [{
    "status": "400",
    "title": "Bad Request",
    "detail": "Invalid data"
  }]
}
```

## Pagination Support

### Creating Pagination Links

```typescript
const links = createPaginationLinks(
  '/farms',        // base URL
  2,               // current page
  10,              // total pages
  20,              // page size
  { sort: 'name' } // additional query params
);

// Result:
{
  "self": "/farms?page[number]=2&page[size]=20&sort=name",
  "first": "/farms?page[number]=1&page[size]=20&sort=name",
  "last": "/farms?page[number]=10&page[size]=20&sort=name",
  "prev": "/farms?page[number]=1&page[size]=20&sort=name",
  "next": "/farms?page[number]=3&page[size]=20&sort=name"
}
```

### Creating Pagination Meta

```typescript
const meta = createPaginationMeta(
  250,  // total count
  2,    // current page
  20    // page size
);

// Result:
{
  "totalCount": 250,
  "pageCount": 13,
  "currentPage": 2,
  "perPage": 20
}
```

## Relationship Handling

### Creating Relationships

```typescript
const response = createJsonApiResource('123', 'farms', farmData, {
  relationships: {
    owner: {
      data: { type: 'users', id: '456' },
      links: {
        self: '/farms/123/relationships/owner',
        related: '/farms/123/owner'
      }
    },
    commodities: {
      data: [
        { type: 'commodities', id: '789' },
        { type: 'commodities', id: '101' }
      ]
    }
  }
});
```

### Including Related Resources

```typescript
const response = createJsonApiResource('123', 'farms', farmData, {
  included: [
    {
      id: '456',
      type: 'users',
      attributes: { name: 'John Doe', email: 'john@example.com' }
    }
  ]
});
```

## Error Handling

### Validation Errors

Zod validation errors are automatically transformed:

```typescript
// Zod error for missing required field
{
  "errors": [{
    "status": "400",
    "code": "VALIDATION_ERROR",
    "title": "Validation Failed",
    "detail": "Name is required",
    "source": {
      "pointer": "/data/attributes/name"
    },
    "meta": {
      "zodErrorCode": "too_small",
      "path": ["name"]
    }
  }]
}
```

### Database Errors

Prisma errors are mapped to appropriate HTTP status codes:

```typescript
// Unique constraint violation (P2002)
{
  "errors": [{
    "status": "409",
    "code": "PRISMA_P2002",
    "title": "Unique Constraint Violation",
    "detail": "A record with this email already exists",
    "meta": {
      "prismaCode": "P2002",
      "target": ["email"]
    }
  }]
}
```

## Testing

All utilities include comprehensive test coverage. Run tests with:

```bash
npm test -- --testPathPatterns="src/common"
```

## Best Practices

1. **Always use the global exception filter** to ensure consistent error responses
2. **Validate all inputs** using ZodValidationPipe with your contract schemas
3. **Use response interceptors** to ensure contract compliance
4. **Include pagination** for collection endpoints
5. **Handle relationships properly** using the relationship utilities
6. **Provide meaningful error messages** in your schemas

## Examples

See `src/common/examples/json-api-usage.example.ts` for comprehensive usage examples including:
- Controller setup
- Service layer integration
- Custom validation pipes
- Pagination handling
- Relationship management
- Error scenarios

## Requirements Satisfied

This implementation satisfies the following requirements:

- **1.2**: Runtime validation using zod schemas with JSON API error responses
- **5.1**: JSON API specification compliance for all responses
- **5.2**: Proper error handling with JSON API error objects and status codes
- **5.4**: Support for JSON API relationships and includes with proper validation
