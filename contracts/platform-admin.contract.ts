import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  PlatformAdminOrganizationListResponseSchema,
  SystemAnalyticsResponseSchema,
  UserDetailsResponseSchema,
  UpdateOrganizationRequestSchema,
  JsonApiOrganizationResponseSchema,
} from './platform-admin.schemas';

const c = initContract();

// Common schemas
const OrganizationIdParam = z.object({
  id: z.string().uuid('Invalid organization ID format'),
});

const UserIdParam = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

const PaginationQuery = z.object({
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().max(100).optional().default(20),
});

const OrganizationFiltersQuery = z.object({
  type: z.enum(['FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM']).optional(),
  isActive: z.coerce.boolean().optional(),
  isVerified: z.coerce.boolean().optional(),
});

// Common error responses
const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

/**
 * Platform Admin API Contract
 * 
 * This contract defines all platform administration endpoints.
 * All endpoints require platform administrator privileges and bypass organization isolation.
 */
export const platformAdminContract = c.router({
  // ============================================================================
  // Organization Management
  // ============================================================================

  /**
   * Get all organizations with filtering and pagination
   * Platform admin only - bypasses organization isolation
   */
  getAllOrganizations: {
    method: 'GET',
    path: '/platform-admin/organizations',
    query: PaginationQuery.merge(OrganizationFiltersQuery),
    responses: {
      200: PlatformAdminOrganizationListResponseSchema,
      400: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
    },
    summary: 'Get all organizations with filtering and pagination',
    description: 'Retrieve a paginated list of all organizations with optional filtering by type, status, and verification state.',
  },

  /**
   * Consolidated organization update endpoint (JSON:API compliant)
   * Replaces individual update endpoints for better API design
   */
  updateOrganizationConsolidated: {
    method: 'PATCH',
    path: '/platform-admin/organizations/:id',
    pathParams: OrganizationIdParam,
    body: UpdateOrganizationRequestSchema,
    responses: {
      200: JsonApiOrganizationResponseSchema,
      400: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
    },
    summary: 'Update organization (consolidated endpoint)',
    description: 'Update organization status, verification, type, plan, and features in a single request. Follows JSON:API specification.',
  },


  // ============================================================================
  // System Analytics & Monitoring
  // ============================================================================

  /**
   * Get platform-wide analytics and metrics
   */
  getSystemAnalytics: {
    method: 'GET',
    path: '/platform-admin/analytics',
    responses: {
      200: SystemAnalyticsResponseSchema,
      401: ErrorResponse,
      403: ErrorResponse,
    },
    summary: 'Get platform-wide analytics',
    description: 'Retrieve comprehensive analytics about organizations, users, farms, and orders across the platform.',
  },

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Get detailed user information across organizations
   */
  getUserDetails: {
    method: 'GET',
    path: '/platform-admin/users/:id',
    pathParams: UserIdParam,
    responses: {
      200: UserDetailsResponseSchema,
      400: ErrorResponse,
      401: ErrorResponse,
      403: ErrorResponse,
      404: ErrorResponse,
    },
    summary: 'Get user details across organizations',
    description: 'Retrieve detailed information about a specific user, including their roles and permissions across all organizations.',
  },
});
