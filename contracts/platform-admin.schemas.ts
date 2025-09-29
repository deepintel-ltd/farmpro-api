import { z } from 'zod';

// Request Schemas
export const SuspendOrganizationRequestSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const ChangeOrganizationTypeRequestSchema = z.object({
  type: z.enum(['FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM']),
});

export const EnableFeatureRequestSchema = z.object({
  feature: z.string().min(1, 'Feature name is required'),
});

export const UpdatePlanRequestSchema = z.object({
  plan: z.enum(['basic', 'professional', 'enterprise']),
});

// Response Schemas
export const PlatformAdminOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM']),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  plan: z.string(),
  features: z.array(z.string()),
  allowedModules: z.array(z.string()),
  suspendedAt: z.string().nullable(),
  suspensionReason: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  verifiedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({
    users: z.number(),
    farms: z.number(),
    buyerOrders: z.number(),
    supplierOrders: z.number(),
  }).optional(),
});

export const PlatformAdminOrganizationResponseSchema = PlatformAdminOrganizationSchema;

export const PlatformAdminOrganizationListResponseSchema = z.object({
  data: z.array(PlatformAdminOrganizationSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export const SystemAnalyticsResponseSchema = z.object({
  organizations: z.object({
    total: z.number(),
    active: z.number(),
    suspended: z.number(),
    byType: z.record(z.number()),
  }),
  users: z.object({
    total: z.number(),
    active: z.number(),
  }),
  farms: z.object({
    total: z.number(),
  }),
  orders: z.object({
    total: z.number(),
  }),
});

export const UserDetailsResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  avatar: z.string().nullable(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
  lastLoginAt: z.string().nullable(),
  organizationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM']),
    plan: z.string(),
  }),
  userRoles: z.array(z.object({
    id: z.string(),
    farmId: z.string().nullable(),
    isActive: z.boolean(),
    role: z.object({
      id: z.string(),
      name: z.string(),
      level: z.number(),
      scope: z.enum(['PLATFORM', 'ORGANIZATION', 'FARM']),
      isPlatformAdmin: z.boolean(),
      permissions: z.array(z.object({
        granted: z.boolean(),
        permission: z.object({
          resource: z.string(),
          action: z.string(),
        }),
      })),
    }),
  })),
});

// Export types
export type SuspendOrganizationRequest = z.infer<typeof SuspendOrganizationRequestSchema>;
export type ChangeOrganizationTypeRequest = z.infer<typeof ChangeOrganizationTypeRequestSchema>;
export type EnableFeatureRequest = z.infer<typeof EnableFeatureRequestSchema>;
export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>;
export type PlatformAdminOrganization = z.infer<typeof PlatformAdminOrganizationSchema>;
export type PlatformAdminOrganizationListResponse = z.infer<typeof PlatformAdminOrganizationListResponseSchema>;
export type SystemAnalyticsResponse = z.infer<typeof SystemAnalyticsResponseSchema>;
export type UserDetailsResponse = z.infer<typeof UserDetailsResponseSchema>;