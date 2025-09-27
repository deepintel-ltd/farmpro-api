# FarmPro API Contracts

[![npm version](https://badge.fury.io/js/%40deepintel-ltd%2Ffarmpro-api-contracts.svg)](https://badge.fury.io/js/%40deepintel-ltd%2Ffarmpro-api-contracts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe API contracts for the FarmPro agricultural platform. This package provides comprehensive TypeScript types, Zod schemas, and ts-rest contracts for building type-safe frontend applications.

## Features

- 🚀 **Type-Safe**: Full TypeScript support with strict typing
- 📋 **JSON API Compliant**: Follows JSON API specification standards
- 🔍 **Zod Validation**: Runtime validation with Zod schemas
- 🛠 **ts-rest Integration**: Ready-to-use API contracts
- 📦 **Tree-Shakable**: Optimized bundle size with tree-shaking
- 🌾 **Agricultural Focus**: Built specifically for farming and agricultural use cases

## Installation

```bash
npm install @deepintel-ltd/farmpro-api-contracts
# or
yarn add @deepintel-ltd/farmpro-api-contracts
# or
pnpm add @deepintel-ltd/farmpro-api-contracts
```

## Quick Start

### Basic Usage

```typescript
import { apiContract, farmContract } from '@deepintel-ltd/farmpro-api-contracts';
import { initClient } from '@ts-rest/core';

// Initialize the API client
const client = initClient(apiContract, {
  baseUrl: 'https://api.farmpro.com',
  baseHeaders: {
    'Content-Type': 'application/vnd.api+json',
  },
});

// Use the client with full type safety
const farms = await client.farms.getFarms({
  query: {
    'page[number]': 1,
    'page[size]': 10,
    include: 'commodities',
  },
});
```

### Using Individual Contracts

```typescript
import { farmContract, authContract } from '@deepintel-ltd/farmpro-api-contracts';

// Use specific contracts
const farmClient = initClient(farmContract, { baseUrl: 'https://api.farmpro.com' });
const authClient = initClient(authContract, { baseUrl: 'https://api.farmpro.com' });
```

### Schema Validation

```typescript
import { FarmSchema, CreateFarmRequestSchema } from '@deepintel-ltd/farmpro-api-contracts';

// Validate data at runtime
const farmData = FarmSchema.parse({
  name: 'Green Acres Farm',
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Farm Road, New York, NY 10001'
  },
  size: 100,
  cropTypes: ['corn', 'wheat'],
  establishedDate: '2020-01-01T00:00:00Z'
});

// Validate request data
const createRequest = CreateFarmRequestSchema.parse({
  data: {
    type: 'farms',
    attributes: farmData
  }
});
```

## API Modules

### Core Resources

- **Farms**: Farm management and operations
- **Commodities**: Agricultural product management
- **Orders**: Order processing and fulfillment
- **Users**: User management and profiles
- **Organizations**: Multi-tenant organization support
- **Inventory**: Inventory tracking and management

### Authentication & Authorization

- **Auth**: User authentication and session management
- **RBAC**: Role-based access control
- **OAuth**: Social login integration

### Business Intelligence

- **Analytics**: Data analytics and reporting
- **Market**: Market data and pricing
- **Intelligence**: AI-powered insights

### Mobile & Field Operations

- **Mobile Field**: Mobile app specific endpoints
- **Activities**: Field activity tracking

## TypeScript Support

This package is built with TypeScript and provides comprehensive type definitions:

```typescript
import type { 
  Farm, 
  FarmResource, 
  CreateFarmRequest,
  ApiContractType 
} from '@deepintel-ltd/farmpro-api-contracts';

// Use types for type safety
const farm: Farm = {
  name: 'My Farm',
  // ... other properties with full type checking
};
```

## JSON API Compliance

All endpoints follow the JSON API specification:

```typescript
// Request format
{
  "data": {
    "type": "farms",
    "attributes": {
      "name": "Green Acres Farm",
      "size": 100
    }
  }
}

// Response format
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "farms",
    "attributes": {
      "name": "Green Acres Farm",
      "size": 100
    },
    "relationships": {
      "commodities": {
        "data": [
          { "type": "commodities", "id": "456e7890-e89b-12d3-a456-426614174001" }
        ]
      }
    }
  },
  "included": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "type": "commodities",
      "attributes": {
        "name": "Corn",
        "category": "grain"
      }
    }
  ]
}
```

## Error Handling

The package includes comprehensive error schemas:

```typescript
import { JsonApiErrorResponseSchema } from '@deepintel-ltd/farmpro-api-contracts';

// Error response format
{
  "errors": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "400",
      "code": "VALIDATION_ERROR",
      "title": "Validation Failed",
      "detail": "The name field is required",
      "source": {
        "pointer": "/data/attributes/name"
      }
    }
  ]
}
```

## Query Parameters

Support for JSON API query parameters:

```typescript
// Pagination
{ 'page[number]': 1, 'page[size]': 10 }

// Field selection
{ 'fields[farms]': 'name,size,location' }

// Filtering
{ 'filter[name]': 'Green Acres' }

// Sorting
{ 'sort': 'name,-created_at' }

// Including related resources
{ 'include': 'commodities,orders' }
```

## Development

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Versioning

This package follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes to the API contracts
- **MINOR**: New features and non-breaking additions
- **PATCH**: Bug fixes and minor improvements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@deepintel.com
- 🐛 Issues: [GitHub Issues](https://github.com/deepintel-ltd/farmpro-api-contracts/issues)
- 📖 Documentation: [API Documentation](https://docs.farmpro.com)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes.

---

Built with ❤️ by [DeepIntel Ltd](https://deepintel.com)
