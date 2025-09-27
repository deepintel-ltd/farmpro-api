/**
 * @fileoverview FarmPro API Contracts
 * 
 * This package provides type-safe API contracts for the FarmPro agricultural platform.
 * It includes all schemas, contracts, and types needed for frontend applications to
 * interact with the FarmPro API in a type-safe manner.
 * 
 * @version 1.0.0
 * @author DeepIntel Ltd
 * @license MIT
 */

// =============================================================================
// Main API Contract
// =============================================================================

export { apiContract, getContractMetadata } from './contracts';
export type { 
  ApiContractType,
  FarmEndpoints,
  CommodityEndpoints,
  UserEndpoints,
  AuthEndpoints,
  InventoryEndpoints,
  OrganizationEndpoints,
  AnalyticsEndpoints,
  MarketEndpoints,
  IntelligenceEndpoints,
  MobileEndpoints
} from './contracts';

// =============================================================================
// Individual Contract Exports
// =============================================================================

export { farmContract } from './farms.contract';
export type { FarmContract } from './farms.contract';

export { commodityContract } from './commodities.contract';
export type { CommodityContract } from './commodities.contract';

export { userContract } from './users.contract';
export type { UserContract } from './users.contract';

export { authContract } from './auth.contract';
export type { AuthContract } from './auth.contract';

export { healthContract } from './health.contract';
export type { HealthContract } from './health.contract';

export { inventoryContract } from './inventory.contract';
export type { InventoryContract } from './inventory.contract';

export { organizationContract } from './organizations.contract';
export type { OrganizationContract } from './organizations.contract';

export { analyticsContract } from './analytics.contract';
export type { AnalyticsContract } from './analytics.contract';

export { marketContract } from './market.contract';
export type { MarketContract } from './market.contract';

export { intelligenceContract } from './intelligence.contract';
export type { IntelligenceContract } from './intelligence.contract';

export { mobileFieldContract } from './mobile-field.contract';

// =============================================================================
// Schema Exports
// =============================================================================

// Core schemas
export {
  // Resource schemas
  FarmSchema,
  CommoditySchema,
  UserSchema,
  InventorySchema,
  OrganizationSchema,
  
  // JSON API schemas
  JsonApiResourceSchema,
  JsonApiCollectionSchema,
  JsonApiErrorSchema,
  JsonApiErrorResponseSchema,
  
  // Request schemas
  JsonApiCreateRequestSchema,
  JsonApiUpdateRequestSchema,
  CreateFarmRequestSchema,
  UpdateFarmRequestSchema,
  CreateCommodityRequestSchema,
  UpdateCommodityRequestSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  CreateInventoryRequestSchema,
  UpdateInventoryRequestSchema,
  CreateOrganizationRequestSchema,
  UpdateOrganizationRequestSchema,
  
  // Query schemas
  JsonApiQuerySchema,
  
  // Health check
  HealthCheckSchema
} from './schemas';

// Auth schemas
export {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ChangePasswordRequestSchema,
  VerifyEmailRequestSchema,
  ValidateTokenRequestSchema,
  AuthResourceSchema,
  AuthUserProfileResourceSchema,
  TokenResourceSchema,
  MessageResourceSchema,
  SessionCollectionSchema,
  OAuthCallbackSchema
} from './auth.schemas';

// Orders schemas
export {
  OrderSchema,
  OrderItemSchema,
  OrderStatusSchema,
  OrderCollectionSchema,
  OrderResourceSchema,
  CreateOrderRequestSchema,
  UpdateOrderRequestSchema
} from './orders.schemas';

// Intelligence schemas
export {
  IntelligenceQuerySchema,
  IntelligenceResponseSchema,
  IntelligenceRequestSchema,
  IntelligenceErrorSchema
} from './intelligence.schemas';

// =============================================================================
// Type Exports
// =============================================================================

// Core types
export type {
  Farm,
  Commodity,
  User,
  Inventory,
  Organization,
  JsonApiResource,
  JsonApiCollection,
  JsonApiError,
  JsonApiErrorResponse,
  FarmResource,
  FarmCollection,
  CommodityResource,
  CommodityCollection,
  UserResource,
  UserCollection,
  InventoryResource,
  InventoryCollection,
  OrganizationResource,
  OrganizationCollection,
  CreateFarmRequest,
  UpdateFarmRequest,
  CreateCommodityRequest,
  UpdateCommodityRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  JsonApiQuery
} from './schemas';

// Auth types
export type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
  ValidateTokenRequest,
  MessageResponse,
  OAuthCallback
} from './auth.schemas';

// Orders types
export type {
  Order,
  OrderItem,
  OrderStatus,
  OrderCollection,
  OrderResource,
  CreateOrderRequest,
  UpdateOrderRequest
} from './orders.schemas';

// Intelligence types
export type {
  IntelligenceQuery,
  IntelligenceResponse,
  IntelligenceRequest,
  IntelligenceError
} from './intelligence.schemas';

// =============================================================================
// Utility Exports
// =============================================================================

export {
  validateRequestBody,
  validateQueryParams,
  validatePathParams,
  validateResponse,
  ContractValidator
} from './common';

// =============================================================================
// Type Safety Exports
// =============================================================================

export {
  // Type guards
  isUuid,
  isIsoDateTime,
  isUrl,
  isEmail,
  
  // Contract validation
  validateContractResponse,
  validateContractRequest,
  
  // Error handling
  createErrorResponse,
  
  // Validation schemas
  StrictUuidSchema,
  StrictIsoDateTimeSchema,
  StrictUrlSchema,
  StrictEmailSchema,
  
  // Enhanced validator
  StrictContractValidator
} from './type-safety';

// =============================================================================
// Type Safety Type Exports
// =============================================================================

export type {
  // Contract utilities
  ExtractResponseType,
  ExtractRequestBodyType,
  ExtractQueryType,
  ExtractPathParamsType,
  ExtractStatusCodes,
  ExtractSuccessResponse,
  ExtractErrorResponse,
  
  
  // Metadata types
  ContractMetadata,
  EndpointMetadata,
  
  // Frontend integration
  ApiClientConfig,
  ApiResponse,
  ApiError
} from './type-safety';
