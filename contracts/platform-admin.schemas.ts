import { z } from 'zod';

// Request Schemas

// Consolidated organization update schema following JSON:API specification
export const UpdateOrganizationRequestSchema = z.object({
  data: z.object({
    type: z.literal('organizations'),
    id: z.string(),
    attributes: z.object({
      // Status management
      status: z.enum(['active', 'suspended']).optional(),
      suspensionReason: z.string().min(10, 'Reason must be at least 10 characters').optional(),

      // Verification
      isVerified: z.boolean().optional(),

      // Organization type
      organizationType: z.enum(['FARM_OPERATION', 'COMMODITY_TRADER', 'LOGISTICS_PROVIDER', 'INTEGRATED_FARM']).optional(),

      // Plan management
      plan: z.enum(['basic', 'professional', 'enterprise']).optional(),

      // Feature management
      features: z.record(z.boolean()).optional(), // e.g., { "marketplace": true, "analytics": false }
    }).refine(
      (data) => {
        // If status is suspended, suspensionReason is required
        if (data.status === 'suspended' && !data.suspensionReason) {
          return false;
        }
        return true;
      },
      {
        message: 'suspensionReason is required when status is suspended',
        path: ['suspensionReason'],
      }
    ),
  }),
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

// JSON:API formatted response
export const JsonApiOrganizationResponseSchema = z.object({
  data: z.object({
    type: z.literal('organizations'),
    id: z.string(),
    attributes: PlatformAdminOrganizationSchema,
  }),
});

// Export types
export type UpdateOrganizationRequest = z.infer<typeof UpdateOrganizationRequestSchema>;
export type JsonApiOrganizationResponse = z.infer<typeof JsonApiOrganizationResponseSchema>;
export type PlatformAdminOrganization = z.infer<typeof PlatformAdminOrganizationSchema>;
export type PlatformAdminOrganizationListResponse = z.infer<typeof PlatformAdminOrganizationListResponseSchema>;
export type SystemAnalyticsResponse = z.infer<typeof SystemAnalyticsResponseSchema>;
export type UserDetailsResponse = z.infer<typeof UserDetailsResponseSchema>;
