# API Contracts - Domain Separation

This directory contains the API contracts organized by domain for better maintainability and separation of concerns.

## Structure

```
contracts/
├── index.ts                    # Main export file
├── contracts.ts               # Combined API contract
├── schemas.ts                 # Zod schemas for validation
├── common.ts                  # Common utilities and query parameters
├── farms.contract.ts          # Farm domain endpoints
├── commodities.contract.ts    # Commodity domain endpoints
├── orders.contract.ts         # Order domain endpoints
├── users.contract.ts          # User domain endpoints
├── health.contract.ts         # System health endpoints
└── README.md                  # This file
```

## Domain Contracts

### Farms Contract (`farms.contract.ts`)
- **CRUD Operations**: GET, POST, PATCH, DELETE for farms
- **Relationships**: Get farm commodities and orders
- **Relationship Data**: Get relationship identifiers
- **Endpoints**: `/farms/*`

### Commodities Contract (`commodities.contract.ts`)
- **CRUD Operations**: GET, POST, PATCH, DELETE for commodities
- **Relationships**: Get commodity orders
- **Relationship Data**: Get relationship identifiers
- **Endpoints**: `/commodities/*`

### Orders Contract (`orders.contract.ts`)
- **CRUD Operations**: GET, POST, PATCH, DELETE for orders
- **Relationships**: Get order buyer and seller (users)
- **Relationship Data**: Get relationship identifiers
- **Endpoints**: `/orders/*`

### Users Contract (`users.contract.ts`)
- **CRUD Operations**: GET, POST, PATCH, DELETE for users
- **Relationships**: Get user farms and orders
- **Relationship Data**: Get relationship identifiers
- **Endpoints**: `/users/*`

### Health Contract (`health.contract.ts`)
- **System Health**: Health check endpoint
- **Endpoints**: `/health`

## Common Utilities (`common.ts`)

### Query Parameters
- **CommonQueryParams**: Basic pagination and includes
- **ResourceFieldsParams**: Field selection for sparse fieldsets
- **FilterParams**: Common filtering parameters
- **AllQueryParams**: Combined query parameters

### Response Schemas
- **CommonErrorResponses**: Standard error response schemas
- **CollectionErrorResponses**: Error responses for collections
- **UuidPathParam**: UUID validation for path parameters

### Validation Utilities
- **validateRequestBody**: Validate request bodies against schemas
- **validateQueryParams**: Validate query parameters
- **validatePathParams**: Validate path parameters
- **validateResponse**: Validate response data
- **ContractValidator**: JSON API compliance validation

## Usage

### Import the Main Contract
```typescript
import { apiContract } from '@/contracts';
// or
import { apiContract } from '@/contracts/contracts';
```

### Import Domain-Specific Contracts
```typescript
import { farmContract } from '@/contracts/farms.contract';
import { userContract } from '@/contracts/users.contract';
```

### Import All Contracts
```typescript
import {
  apiContract,
  farmContract,
  commodityContract,
  orderContract,
  userContract,
  healthContract
} from '@/contracts';
```

### Import Schemas and Utilities
```typescript
import {
  FarmSchema,
  CreateFarmRequestSchema,
  validateRequestBody,
  ContractValidator
} from '@/contracts';
```

## Benefits of Domain Separation

### 1. **Maintainability**
- Each domain contract is focused and manageable
- Easier to locate and modify specific endpoints
- Reduced cognitive load when working on specific features

### 2. **Team Collaboration**
- Different teams can work on different domains simultaneously
- Reduced merge conflicts
- Clear ownership boundaries

### 3. **Modularity**
- Contracts can be imported individually as needed
- Easier to test specific domains in isolation
- Better tree-shaking for client-side usage

### 4. **Scalability**
- Easy to add new domains without affecting existing ones
- Clear pattern for extending the API
- Consistent structure across all domains

### 5. **Type Safety**
- Each domain exports its own types
- Better IntelliSense and autocomplete
- Compile-time validation of contract structure

## Adding New Domains

To add a new domain (e.g., `analytics`):

1. **Create the contract file**: `analytics.contract.ts`
```typescript
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { AnalyticsResourceSchema } from './schemas';
import { CommonQueryParams, CommonErrorResponses } from './common';

const c = initContract();

export const analyticsContract = c.router({
  getAnalytics: {
    method: 'GET',
    path: '/analytics',
    query: CommonQueryParams,
    responses: {
      200: AnalyticsResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get analytics data',
  },
});

export type AnalyticsContract = typeof analyticsContract;
```

2. **Add schemas to `schemas.ts`**
```typescript
export const AnalyticsSchema = z.object({
  // analytics fields
});

export const AnalyticsResourceSchema = JsonApiResourceSchema(AnalyticsSchema);
```

3. **Update main contract in `contracts.ts`**
```typescript
import { analyticsContract } from './analytics.contract';

export const apiContract = c.router({
  farms: farmContract,
  commodities: commodityContract,
  orders: orderContract,
  users: userContract,
  analytics: analyticsContract, // Add here
  ...healthContract,
});
```

4. **Export from `index.ts`**
```typescript
export * from './analytics.contract';
```

## Testing

Each domain contract can be tested independently:

```typescript
import { farmContract } from '@/contracts/farms.contract';

describe('Farm Contract', () => {
  it('should have all CRUD operations', () => {
    expect(farmContract.getFarms).toBeDefined();
    expect(farmContract.createFarm).toBeDefined();
    // ... more tests
  });
});
```

## Migration Notes

The original monolithic `contracts.ts` file has been split into domain-specific files while maintaining backward compatibility:

- **All exports remain the same** - existing imports will continue to work
- **Type definitions are preserved** - no breaking changes to types
- **Contract structure is identical** - same endpoints and schemas
- **Validation utilities are enhanced** - better error handling and validation

This refactoring improves code organization without breaking existing functionality.
