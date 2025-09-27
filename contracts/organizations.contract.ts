import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  OrganizationResourceSchema,
  OrganizationCollectionSchema,
  OrganizationSettingsResourceSchema,
  OrganizationTeamStatsResourceSchema,
  OrganizationTeamCollectionSchema,
  OrganizationUsageResourceSchema,
  OrganizationBillingResourceSchema,
  CreateOrganizationRequestSchema,
  UpdateOrganizationRequestSchema,
  UpdateOrganizationSettingsRequestSchema,
  OrganizationVerificationRequestSchema,
  IntegrationConfigRequestSchema,
  OrganizationExportRequestSchema,
  OrganizationBackupRequestSchema,
  OrganizationBillingRequestSchema,
  OrganizationAnalyticsQuerySchema,
  OrganizationActivityQuerySchema,
  OrganizationComplianceQuerySchema,
} from './schemas';

const c = initContract();

// =============================================================================
// Organization Management Contract
// =============================================================================

export const organizationContract = c.router({
  // =============================================================================
  // Organization Profile & Settings
  // =============================================================================

  getProfile: {
    method: 'GET',
    path: '/api/organizations/profile',
    responses: {
      200: OrganizationResourceSchema,
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get current organization profile',
    description: 'Retrieve the current organization profile with settings and statistics',
  },

  updateProfile: {
    method: 'PUT',
    path: '/api/organizations/profile',
    body: UpdateOrganizationRequestSchema,
    responses: {
      200: OrganizationResourceSchema,
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Update organization profile',
    description: 'Update the current organization profile information',
  },

  uploadLogo: {
    method: 'POST',
    path: '/api/organizations/logo',
    contentType: 'multipart/form-data',
    body: z.object({
      file: z.instanceof(File),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('organizations'),
          attributes: z.object({
            logo: z.url(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Upload organization logo',
    description: 'Upload a new logo for the organization',
  },

  getSettings: {
    method: 'GET',
    path: '/api/organizations/settings',
    responses: {
      200: OrganizationSettingsResourceSchema,
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get organization settings',
    description: 'Retrieve the current organization configuration settings',
  },

  updateSettings: {
    method: 'PUT',
    path: '/api/organizations/settings',
    body: UpdateOrganizationSettingsRequestSchema,
    responses: {
      200: OrganizationSettingsResourceSchema,
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Update organization settings',
    description: 'Update the organization configuration settings',
  },

  // =============================================================================
  // Organization Verification
  // =============================================================================

  requestVerification: {
    method: 'POST',
    path: '/api/organizations/request-verification',
    body: OrganizationVerificationRequestSchema,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('verification-requests'),
          attributes: z.object({
            status: z.string(),
            submittedAt: z.iso.datetime(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Request organization verification',
    description: 'Submit a request for organization verification',
  },

  getVerificationStatus: {
    method: 'GET',
    path: '/api/organizations/verification-status',
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('verification-status'),
          attributes: z.object({
            status: z.enum(['pending', 'approved', 'rejected', 'not_submitted']),
            requirements: z.array(z.string()),
            submittedAt: z.iso.datetime().optional(),
            reviewedAt: z.iso.datetime().optional(),
            notes: z.string().optional(),
          }),
        }),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Check verification status',
    description: 'Get the current verification status and requirements',
  },

  // =============================================================================
  // Data & Analytics
  // =============================================================================

  getAnalytics: {
    method: 'GET',
    path: '/api/organizations/analytics',
    query: OrganizationAnalyticsQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('analytics'),
          attributes: z.object({
            period: z.string(),
            metrics: z.record(z.string(), z.any()),
            trends: z.array(z.object({
              date: z.string(),
              value: z.number(),
            })),
          }),
        }),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get organization analytics',
    description: 'Retrieve organization performance metrics and analytics',
  },

  getActivityFeed: {
    method: 'GET',
    path: '/api/organizations/activity-feed',
    query: OrganizationActivityQuerySchema,
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('activities'),
          attributes: z.object({
            action: z.string(),
            entity: z.string(),
            entityId: z.string().optional(),
            details: z.record(z.string(), z.any()),
            timestamp: z.iso.datetime(),
            user: z.object({
              id: z.string(),
              name: z.string(),
            }),
          }),
        })),
        meta: z.object({
          pagination: z.object({
            page: z.number(),
            limit: z.number(),
            total: z.number(),
            pages: z.number(),
          }),
        }),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get organization activity feed',
    description: 'Retrieve recent organization activities and events',
  },

  getComplianceReport: {
    method: 'GET',
    path: '/api/organizations/compliance-report',
    query: OrganizationComplianceQuerySchema,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('compliance-reports'),
          attributes: z.object({
            period: z.string(),
            standard: z.string(),
            status: z.string(),
            score: z.number(),
            requirements: z.array(z.object({
              id: z.string(),
              name: z.string(),
              status: z.string(),
              lastChecked: z.iso.datetime(),
            })),
          }),
        }),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get compliance report',
    description: 'Retrieve compliance and audit report for the organization',
  },

  // =============================================================================
  // Team Management
  // =============================================================================

  getTeam: {
    method: 'GET',
    path: '/api/organizations/team',
    responses: {
      200: OrganizationTeamCollectionSchema,
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get organization team',
    description: 'Retrieve organization team members with roles and activity',
  },

  getTeamStats: {
    method: 'GET',
    path: '/api/organizations/team/stats',
    query: z.object({
      period: z.string().optional(),
      roleId: z.uuid().optional(),
      farmId: z.uuid().optional(),
    }),
    responses: {
      200: OrganizationTeamStatsResourceSchema,
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get team performance statistics',
    description: 'Retrieve team productivity and performance metrics',
  },

  // =============================================================================
  // Integration Management
  // =============================================================================

  getIntegrations: {
    method: 'GET',
    path: '/api/organizations/integrations',
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('integrations'),
          attributes: z.object({
            name: z.string(),
            description: z.string(),
            isActive: z.boolean(),
            isConfigured: z.boolean(),
            lastSync: z.iso.datetime().optional(),
          }),
        })),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'List available integrations',
    description: 'Get list of available and configured integrations',
  },

  configureIntegration: {
    method: 'POST',
    path: '/api/organizations/integrations/:integrationId',
    pathParams: z.object({
      integrationId: z.string(),
    }),
    body: IntegrationConfigRequestSchema,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('integrations'),
          attributes: z.object({
            name: z.string(),
            isActive: z.boolean(),
            isConfigured: z.boolean(),
            configuredAt: z.iso.datetime(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Configure integration',
    description: 'Configure a specific integration for the organization',
  },

  updateIntegration: {
    method: 'PUT',
    path: '/api/organizations/integrations/:integrationId',
    pathParams: z.object({
      integrationId: z.string(),
    }),
    body: z.object({
      data: z.object({
        type: z.literal('integrations'),
        attributes: z.object({
          config: z.record(z.string(), z.any()),
          isActive: z.boolean(),
        }),
      }),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('integrations'),
          attributes: z.object({
            name: z.string(),
            isActive: z.boolean(),
            isConfigured: z.boolean(),
            updatedAt: z.iso.datetime(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Update integration settings',
    description: 'Update configuration for a specific integration',
  },

  deleteIntegration: {
    method: 'DELETE',
    path: '/api/organizations/integrations/:integrationId',
    pathParams: z.object({
      integrationId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('integrations'),
          attributes: z.object({
            name: z.string(),
            isActive: z.boolean(),
            removedAt: z.iso.datetime(),
          }),
        }),
      }),
      404: z.object({
        errors: z.array(z.object({
          status: z.literal('404'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Remove integration',
    description: 'Remove a specific integration from the organization',
  },

  getIntegrationStatus: {
    method: 'GET',
    path: '/api/organizations/integrations/:integrationId/status',
    pathParams: z.object({
      integrationId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('integration-status'),
          attributes: z.object({
            name: z.string(),
            status: z.enum(['healthy', 'warning', 'error', 'disconnected']),
            lastSync: z.iso.datetime().optional(),
            nextSync: z.iso.datetime().optional(),
            errorMessage: z.string().optional(),
          }),
        }),
      }),
      404: z.object({
        errors: z.array(z.object({
          status: z.literal('404'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Check integration status',
    description: 'Get the health and status of a specific integration',
  },

  // =============================================================================
  // Export & Backup
  // =============================================================================

  requestExport: {
    method: 'POST',
    path: '/api/organizations/export',
    body: OrganizationExportRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('export-jobs'),
          attributes: z.object({
            status: z.enum(['pending', 'processing', 'completed', 'failed']),
            format: z.string(),
            dataTypes: z.array(z.string()),
            createdAt: z.iso.datetime(),
            estimatedCompletion: z.iso.datetime().optional(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Request organization data export',
    description: 'Create a new data export job for the organization',
  },

  getExports: {
    method: 'GET',
    path: '/api/organizations/exports',
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('export-jobs'),
          attributes: z.object({
            status: z.enum(['pending', 'processing', 'completed', 'failed']),
            format: z.string(),
            dataTypes: z.array(z.string()),
            createdAt: z.iso.datetime(),
            completedAt: z.iso.datetime().optional(),
            downloadUrl: z.url().optional(),
            errorMessage: z.string().optional(),
          }),
        })),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'List export jobs',
    description: 'Get history of export jobs for the organization',
  },

  getExport: {
    method: 'GET',
    path: '/api/organizations/exports/:exportId',
    pathParams: z.object({
      exportId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('export-jobs'),
          attributes: z.object({
            status: z.enum(['pending', 'processing', 'completed', 'failed']),
            format: z.string(),
            dataTypes: z.array(z.string()),
            createdAt: z.iso.datetime(),
            completedAt: z.iso.datetime().optional(),
            downloadUrl: z.url().optional(),
            errorMessage: z.string().optional(),
            fileSize: z.number().optional(),
          }),
        }),
      }),
      404: z.object({
        errors: z.array(z.object({
          status: z.literal('404'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get export status/download',
    description: 'Get details of a specific export job or download the file',
  },

  createBackup: {
    method: 'POST',
    path: '/api/organizations/backup',
    body: OrganizationBackupRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('backup-jobs'),
          attributes: z.object({
            status: z.enum(['pending', 'processing', 'completed', 'failed']),
            includeMedia: z.boolean(),
            retention: z.string(),
            createdAt: z.iso.datetime(),
            estimatedCompletion: z.iso.datetime().optional(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Create organization backup',
    description: 'Create a backup of the organization data',
  },

  // =============================================================================
  // Subscription & Billing
  // =============================================================================

  getBilling: {
    method: 'GET',
    path: '/api/organizations/billing',
    responses: {
      200: OrganizationBillingResourceSchema,
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get billing information',
    description: 'Retrieve billing details, usage, and invoices',
  },

  getUsage: {
    method: 'GET',
    path: '/api/organizations/usage',
    responses: {
      200: OrganizationUsageResourceSchema,
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get current plan usage',
    description: 'Retrieve usage metrics compared to plan limits',
  },

  getPlans: {
    method: 'GET',
    path: '/api/organizations/plans',
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('plans'),
          attributes: z.object({
            name: z.string(),
            description: z.string(),
            price: z.number(),
            billingCycle: z.string(),
            features: z.array(z.string()),
            limits: z.object({
              users: z.number(),
              farms: z.number(),
              storage: z.number(),
              apiCalls: z.number(),
            }),
          }),
        })),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'List available subscription plans',
    description: 'Get available subscription plans with features and pricing',
  },

  subscribe: {
    method: 'POST',
    path: '/api/organizations/subscribe',
    body: OrganizationBillingRequestSchema,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('subscriptions'),
          attributes: z.object({
            planId: z.string(),
            billingCycle: z.string(),
            status: z.string(),
            startDate: z.iso.datetime(),
            nextBillingDate: z.iso.datetime(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Subscribe to a plan',
    description: 'Subscribe the organization to a specific plan',
  },

  updateSubscription: {
    method: 'PUT',
    path: '/api/organizations/subscription',
    body: z.object({
      data: z.object({
        type: z.literal('subscriptions'),
        attributes: z.object({
          planId: z.string(),
          billingCycle: z.string(),
        }),
      }),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('subscriptions'),
          attributes: z.object({
            planId: z.string(),
            billingCycle: z.string(),
            status: z.string(),
            updatedAt: z.iso.datetime(),
          }),
        }),
      }),
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Update subscription',
    description: 'Update the organization subscription plan or billing cycle',
  },

  getInvoices: {
    method: 'GET',
    path: '/api/organizations/invoices',
    query: z.object({
      page: z.coerce.number().positive().optional(),
      limit: z.coerce.number().positive().max(100).optional(),
      status: z.string().optional(),
    }),
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('invoices'),
          attributes: z.object({
            number: z.string(),
            status: z.string(),
            amount: z.number(),
            currency: z.string(),
            dueDate: z.iso.datetime(),
            paidAt: z.iso.datetime().optional(),
            downloadUrl: z.url().optional(),
          }),
        })),
        meta: z.object({
          pagination: z.object({
            page: z.number(),
            limit: z.number(),
            total: z.number(),
            pages: z.number(),
          }),
        }),
      }),
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'List invoices',
    description: 'Get invoice history for the organization',
  },

  getInvoice: {
    method: 'GET',
    path: '/api/organizations/invoices/:invoiceId',
    pathParams: z.object({
      invoiceId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('invoices'),
          attributes: z.object({
            number: z.string(),
            status: z.string(),
            amount: z.number(),
            currency: z.string(),
            dueDate: z.iso.datetime(),
            paidAt: z.iso.datetime().optional(),
            downloadUrl: z.url().optional(),
            lineItems: z.array(z.object({
              description: z.string(),
              quantity: z.number(),
              unitPrice: z.number(),
              total: z.number(),
            })),
          }),
        }),
      }),
      404: z.object({
        errors: z.array(z.object({
          status: z.literal('404'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get invoice details',
    description: 'Get detailed information for a specific invoice',
  },

  // =============================================================================
  // Platform Admin Endpoints
  // =============================================================================

  getOrganizations: {
    method: 'GET',
    path: '/api/organizations',
    query: z.object({
      page: z.coerce.number().positive().optional(),
      limit: z.coerce.number().positive().max(100).optional(),
      search: z.string().optional(),
      type: z.string().optional(),
      isActive: z.coerce.boolean().optional(),
      plan: z.string().optional(),
    }),
    responses: {
      200: OrganizationCollectionSchema,
      401: z.object({
        errors: z.array(z.object({
          status: z.literal('401'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'List all organizations (platform admin)',
    description: 'Get paginated list of all organizations (admin only)',
  },

  getOrganization: {
    method: 'GET',
    path: '/api/organizations/:orgId',
    pathParams: z.object({
      orgId: z.string(),
    }),
    responses: {
      200: OrganizationResourceSchema,
      404: z.object({
        errors: z.array(z.object({
          status: z.literal('404'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Get organization details (admin)',
    description: 'Get detailed information for a specific organization (admin only)',
  },

  createOrganization: {
    method: 'POST',
    path: '/api/organizations',
    body: CreateOrganizationRequestSchema,
    responses: {
      201: OrganizationResourceSchema,
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Create new organization (admin)',
    description: 'Create a new organization (admin only)',
  },

  updateOrganization: {
    method: 'PUT',
    path: '/api/organizations/:orgId',
    pathParams: z.object({
      orgId: z.string(),
    }),
    body: UpdateOrganizationRequestSchema,
    responses: {
      200: OrganizationResourceSchema,
      400: z.object({
        errors: z.array(z.object({
          status: z.literal('400'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
      404: z.object({
        errors: z.array(z.object({
          status: z.literal('404'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Update organization (admin)',
    description: 'Update organization details (admin only)',
  },

  deleteOrganization: {
    method: 'DELETE',
    path: '/api/organizations/:orgId',
    pathParams: z.object({
      orgId: z.string(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('organizations'),
          attributes: z.object({
            isActive: z.boolean(),
            deletedAt: z.iso.datetime(),
          }),
        }),
      }),
      404: z.object({
        errors: z.array(z.object({
          status: z.literal('404'),
          code: z.string(),
          title: z.string(),
          detail: z.string(),
        })),
      }),
    },
    summary: 'Soft delete organization',
    description: 'Deactivate an organization (admin only)',
  },
});

// =============================================================================
// Type Exports
// =============================================================================

export type OrganizationContract = typeof organizationContract;
