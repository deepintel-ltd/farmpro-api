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
  BillingEndpoints,
  PlatformAdminEndpoints,
  MobileEndpoints,
  WeatherEndpoints,
  TransactionsEndpoints
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

export { billingContract } from './billing.contract';
export type { BillingContract } from './billing.contract';

export { platformAdminContract } from './platform-admin.contract';
export type { PlatformAdminContract } from './platform-admin.contract';

export { mobileFieldContract } from './mobile-field.contract';

export { weatherContract } from './weather.contract';
export type { WeatherContract } from './weather.contract';

// Order contracts
export { ordersCrudContract } from './orders-crud.contract';
export type { OrdersCrudContract } from './orders-crud.contract';

export { ordersMarketplaceContract } from './orders-marketplace.contract';
export type { OrdersMarketplaceContract } from './orders-marketplace.contract';

export { ordersMessagingContract } from './orders-messaging.contract';
export type { OrdersMessagingContract } from './orders-messaging.contract';

export { ordersAnalyticsContract } from './orders-analytics.contract';
export type { OrdersAnalyticsContract } from './orders-analytics.contract';

export { ordersDisputesContract } from './orders-disputes.contract';
export type { OrdersDisputesContract } from './orders-disputes.contract';

export { ordersRelationshipsContract } from './orders-relationships.contract';
export type { OrdersRelationshipsContract } from './orders-relationships.contract';

// Activities contracts
export { activitiesCrudContract } from './activities-crud.contract';
export type { ActivitiesCrudContract } from './activities-crud.contract';

export { activitiesExecutionContract } from './activities-execution.contract';
export type { ActivitiesExecutionContract } from './activities-execution.contract';

export { activitiesTemplatesContract } from './activities-templates.contract';
export type { ActivitiesTemplatesContract } from './activities-templates.contract';

export { activitiesSchedulingContract } from './activities-scheduling.contract';
export type { ActivitiesSchedulingContract } from './activities-scheduling.contract';

export { activitiesTeamContract } from './activities-team.contract';
export type { ActivitiesTeamContract } from './activities-team.contract';

export { activitiesCostsContract } from './activities-costs.contract';
export type { ActivitiesCostsContract } from './activities-costs.contract';

export { activitiesMediaContract } from './activities-media.contract';
export type { ActivitiesMediaContract } from './activities-media.contract';

export { activitiesAnalyticsContract } from './activities-analytics.contract';
export type { ActivitiesAnalyticsContract } from './activities-analytics.contract';

// RBAC contract
export { rbacContract } from './rbac.contract';
export type { RbacContract } from './rbac.contract';

// Media contract
export { mediaContract } from './media.contract';
export type { MediaContract } from './media.contract';

// Transactions contract
export { transactionsContract } from './transactions.contract';
export type { TransactionsContract } from './transactions.contract';

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
  TokenResponseSchema,
  UserProfileSchema,
  AuthResponseSchema,
  SessionSchema,
  MessageResponseSchema,
  OAuthCallbackSchema,
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

// Transactions schemas
export {
  TransactionTypeSchema,
  TransactionStatusSchema,
  TransactionSchema,
  CreateTransactionRequestSchema,
  UpdateTransactionRequestSchema,
  TransactionFiltersSchema,
  TransactionSummarySchema
} from './transactions.schemas';

// =============================================================================
// Type Exports
// =============================================================================

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
  TokenResponse,
  UserProfile,
  AuthResponse,
  Session,
  MessageResponse,
  OAuthCallback,
} from './auth.schemas';

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

// Transactions types
export type {
  TransactionType,
  TransactionStatus,
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  TransactionSummary
} from './transactions.schemas';

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
