# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of FarmPro API Contracts package
- Comprehensive TypeScript type definitions
- Zod schema validation for all API endpoints
- ts-rest contract definitions
- JSON API compliant request/response schemas
- Support for all major FarmPro API modules:
  - Farms management
  - Commodities tracking
  - Orders processing
  - User management
  - Organization support
  - Inventory management
  - Authentication & authorization
  - Analytics & reporting
  - Market data
  - AI intelligence
  - Mobile field operations
- Tree-shakable ESM and CommonJS builds
- Comprehensive documentation and examples

## [1.0.0] - 2024-01-15

### Added
- Initial release
- Core API contracts for FarmPro platform
- Type-safe client generation
- Runtime validation with Zod
- JSON API specification compliance
- Multi-format build output (ESM/CJS)
- TypeScript declaration files
- Comprehensive error handling schemas
- Query parameter validation
- Relationship management schemas

### Features
- **Farms Module**: Complete farm management contracts
- **Commodities Module**: Agricultural product tracking
- **Orders Module**: Order processing and fulfillment
- **Users Module**: User management and profiles
- **Organizations Module**: Multi-tenant support
- **Inventory Module**: Inventory tracking and management
- **Auth Module**: Authentication and session management
- **RBAC Module**: Role-based access control
- **Analytics Module**: Data analytics and reporting
- **Market Module**: Market data and pricing
- **Intelligence Module**: AI-powered insights
- **Mobile Field Module**: Mobile app specific endpoints

### Technical
- Built with TypeScript 5.9+
- Uses Zod for runtime validation
- Integrates with ts-rest for type-safe API clients
- Supports tree-shaking for optimal bundle sizes
- Follows JSON API specification
- Comprehensive error handling
- Type-safe query parameters
- Relationship management
- Pagination support
- Field selection
- Filtering and sorting
