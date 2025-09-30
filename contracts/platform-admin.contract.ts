import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  PlatformAdminOrganizationListResponseSchema,
  PlatformAdminOrganizationResponseSchema,
  SuspendOrganizationRequestSchema,
  ChangeOrganizationTypeRequestSchema,
  EnableFeatureRequestSchema,
  UpdatePlanRequestSchema,
  SystemAnalyticsResponseSchema,
  UserDetailsResponseSchema,
} from './platform-admin.schemas';

const c = initContract();

export const platformAdminContract = c.router({
  // Organization Management
  getAllOrganizations: {
    method: 'GET',
    path: '/platform-admin/organizations',
    query: z.object({
      page: z.coerce.number().positive().optional(),
      limit: z.coerce.number().positive().max(100).optional(),
      type: z.enum(['FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM']).optional(),
      isActive: z.coerce.boolean().optional(),
    }),
    responses: {
      200: PlatformAdminOrganizationListResponseSchema,
    },
    summary: 'Get all organizations (platform admin only)',
  },

  suspendOrganization: {
    method: 'POST',
    path: '/platform-admin/organizations/:id/suspend',
    pathParams: z.object({
      id: z.string(),
    }),
    body: SuspendOrganizationRequestSchema,
    responses: {
      200: PlatformAdminOrganizationResponseSchema,
    },
    summary: 'Suspend an organization',
  },

  reactivateOrganization: {
    method: 'POST',
    path: '/platform-admin/organizations/:id/reactivate',
    pathParams: z.object({
      id: z.string(),
    }),
    body: z.object({}),
    responses: {
      200: PlatformAdminOrganizationResponseSchema,
    },
    summary: 'Reactivate a suspended organization',
  },

  verifyOrganization: {
    method: 'POST',
    path: '/platform-admin/organizations/:id/verify',
    pathParams: z.object({
      id: z.string(),
    }),
    body: z.object({}),
    responses: {
      200: PlatformAdminOrganizationResponseSchema,
    },
    summary: 'Verify an organization',
  },

  changeOrganizationType: {
    method: 'PUT',
    path: '/platform-admin/organizations/:id/type',
    pathParams: z.object({
      id: z.string(),
    }),
    body: ChangeOrganizationTypeRequestSchema,
    responses: {
      200: PlatformAdminOrganizationResponseSchema,
    },
    summary: 'Change organization type',
  },

  // Feature Management
  enableFeature: {
    method: 'POST',
    path: '/platform-admin/organizations/:id/features/enable',
    pathParams: z.object({
      id: z.string(),
    }),
    body: EnableFeatureRequestSchema,
    responses: {
      200: PlatformAdminOrganizationResponseSchema,
    },
    summary: 'Enable a feature for an organization',
  },

  disableFeature: {
    method: 'POST',
    path: '/platform-admin/organizations/:id/features/disable',
    pathParams: z.object({
      id: z.string(),
    }),
    body: EnableFeatureRequestSchema,
    responses: {
      200: PlatformAdminOrganizationResponseSchema,
    },
    summary: 'Disable a feature for an organization',
  },

  updateOrganizationPlan: {
    method: 'PUT',
    path: '/platform-admin/organizations/:id/plan',
    pathParams: z.object({
      id: z.string(),
    }),
    body: UpdatePlanRequestSchema,
    responses: {
      200: PlatformAdminOrganizationResponseSchema,
    },
    summary: 'Update organization plan',
  },

  // System Analytics
  getSystemAnalytics: {
    method: 'GET',
    path: '/platform-admin/analytics',
    responses: {
      200: SystemAnalyticsResponseSchema,
    },
    summary: 'Get platform-wide analytics',
  },

  getUserDetails: {
    method: 'GET',
    path: '/platform-admin/users/:id',
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {
      200: UserDetailsResponseSchema,
    },
    summary: 'Get user details across organizations',
  },
});