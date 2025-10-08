import {
  Controller,
  Logger,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { OrganizationsService } from './organizations.service';
import { InvitationService } from './services/invitation.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import { organizationContract } from '../../contracts/organizations.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import {
  RequirePermission,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
@Secured(FEATURES.ORGANIZATIONS)
export class OrganizationsController {
  private readonly logger = new Logger(OrganizationsController.name);

  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly invitationService: InvitationService,
  ) {}

  // =============================================================================
  // Organization Profile & Settings
  // =============================================================================

  @TsRestHandler(organizationContract.getProfile)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getProfile(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getProfile, async () => {
      try {
        const result = await this.organizationsService.getProfile(
          req.user.organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get organization profile failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Organization not found',
          notFoundCode: 'ORGANIZATION_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve organization profile',
          internalErrorCode: 'GET_ORGANIZATION_PROFILE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.updateProfile)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public updateProfile(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.updateProfile,
      async ({ body }) => {
        try {
          const result = await this.organizationsService.updateProfile(
            body,
            req,
          );

          this.logger.log(
            `Organization profile updated by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Update organization profile failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Organization not found',
            notFoundCode: 'ORGANIZATION_NOT_FOUND',
            badRequestMessage: 'Invalid organization data',
            badRequestCode: 'INVALID_ORGANIZATION_DATA',
            internalErrorMessage: 'Failed to update organization profile',
            internalErrorCode: 'UPDATE_ORGANIZATION_PROFILE_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.uploadLogo)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  @UseInterceptors(FileInterceptor('file'))
  public uploadLogo(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.uploadLogo, async () => {
      try {
        const result = await this.organizationsService.uploadLogo(
          req.user.organizationId,
          file,
        );

        this.logger.log(
          `Organization logo uploaded by user ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Upload organization logo failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid file or upload failed',
          badRequestCode: 'INVALID_FILE_UPLOAD',
          internalErrorMessage: 'Failed to upload organization logo',
          internalErrorCode: 'UPLOAD_ORGANIZATION_LOGO_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.getSettings)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getSettings(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getSettings, async () => {
      try {
        const result = await this.organizationsService.getSettings(
          req.user.organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get organization settings failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Organization not found',
          notFoundCode: 'ORGANIZATION_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve organization settings',
          internalErrorCode: 'GET_ORGANIZATION_SETTINGS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.updateSettings)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public updateSettings(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.updateSettings,
      async ({ body }) => {
        try {
          const result = await this.organizationsService.updateSettings(
            req.user.organizationId,
            body,
          );

          this.logger.log(
            `Organization settings updated by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Update organization settings failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Organization not found',
            notFoundCode: 'ORGANIZATION_NOT_FOUND',
            badRequestMessage: 'Invalid settings data',
            badRequestCode: 'INVALID_SETTINGS_DATA',
            internalErrorMessage: 'Failed to update organization settings',
            internalErrorCode: 'UPDATE_ORGANIZATION_SETTINGS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Organization Verification
  // =============================================================================

  @TsRestHandler(organizationContract.requestVerification)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public requestVerification(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.requestVerification,
      async ({ body }) => {
        try {
          const result = await this.organizationsService.requestVerification(
            req.user.organizationId,
            body,
          );

          this.logger.log(
            `Verification request submitted by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Request verification failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid verification data',
            badRequestCode: 'INVALID_VERIFICATION_DATA',
            internalErrorMessage: 'Failed to submit verification request',
            internalErrorCode: 'REQUEST_VERIFICATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getVerificationStatus)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getVerificationStatus(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getVerificationStatus,
      async () => {
        try {
          const result = await this.organizationsService.getVerificationStatus(
            req.user.organizationId,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Get verification status failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Organization not found',
            notFoundCode: 'ORGANIZATION_NOT_FOUND',
            internalErrorMessage: 'Failed to retrieve verification status',
            internalErrorCode: 'GET_VERIFICATION_STATUS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Data & Analytics
  // =============================================================================

  @TsRestHandler(organizationContract.getAnalytics)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getAnalytics(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getAnalytics,
      async ({ query }) => {
        try {
          const result = await this.organizationsService.getAnalytics(
            req.user.organizationId,
            query,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Get organization analytics failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            internalErrorMessage: 'Failed to retrieve organization analytics',
            internalErrorCode: 'GET_ORGANIZATION_ANALYTICS_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getActivityFeed)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getActivityFeed(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getActivityFeed,
      async ({ query }) => {
        try {
          const result = await this.organizationsService.getActivityFeed(
            req.user.organizationId,
            query,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Get organization activity feed failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            internalErrorMessage:
              'Failed to retrieve organization activity feed',
            internalErrorCode: 'GET_ORGANIZATION_ACTIVITY_FEED_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getComplianceReport)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getComplianceReport(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getComplianceReport,
      async ({ query }) => {
        try {
          const result = await this.organizationsService.getComplianceReport(
            req.user.organizationId,
            query,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            'Get organization compliance report failed:',
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            internalErrorMessage:
              'Failed to retrieve organization compliance report',
            internalErrorCode: 'GET_ORGANIZATION_COMPLIANCE_REPORT_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Team Management
  // =============================================================================

  @TsRestHandler(organizationContract.getTeam)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getTeam(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getTeam, async () => {
      try {
        const result = await this.organizationsService.getTeam(
          req.user.organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get organization team failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve organization team',
          internalErrorCode: 'GET_ORGANIZATION_TEAM_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.getTeamStats)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getTeamStats(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getTeamStats,
      async ({ query }) => {
        try {
          const result = await this.organizationsService.getTeamStats(
            req.user.organizationId,
            query,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Get organization team stats failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            internalErrorMessage: 'Failed to retrieve organization team stats',
            internalErrorCode: 'GET_ORGANIZATION_TEAM_STATS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Integration Management
  // =============================================================================

  @TsRestHandler(organizationContract.getIntegrations)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getIntegrations(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getIntegrations, async () => {
      try {
        const result = await this.organizationsService.getIntegrations(
          req.user.organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get organization integrations failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve organization integrations',
          internalErrorCode: 'GET_ORGANIZATION_INTEGRATIONS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.configureIntegration)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public configureIntegration(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.configureIntegration,
      async ({ params, body }) => {
        try {
          const result = await this.organizationsService.configureIntegration(
            req.user.organizationId,
            params.integrationId,
            body.data.attributes,
          );

          this.logger.log(
            `Integration ${params.integrationId} configured by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Configure integration ${params.integrationId} failed:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid integration configuration',
            badRequestCode: 'INVALID_INTEGRATION_CONFIG',
            internalErrorMessage: 'Failed to configure integration',
            internalErrorCode: 'CONFIGURE_INTEGRATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.updateIntegration)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public updateIntegration(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.updateIntegration,
      async ({ params, body }) => {
        try {
          const result = await this.organizationsService.updateIntegration(
            req.user.organizationId,
            params.integrationId,
            body.data.attributes,
          );

          this.logger.log(
            `Integration ${params.integrationId} updated by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Update integration ${params.integrationId} failed:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid integration update data',
            badRequestCode: 'INVALID_INTEGRATION_UPDATE',
            internalErrorMessage: 'Failed to update integration',
            internalErrorCode: 'UPDATE_INTEGRATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.deleteIntegration)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.DELETE)
  @RequireRoleLevel(50)
  public deleteIntegration(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.deleteIntegration,
      async ({ params }) => {
        try {
          const result = await this.organizationsService.deleteIntegration(
            req.user.organizationId,
            params.integrationId,
          );

          this.logger.log(
            `Integration ${params.integrationId} deleted by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Delete integration ${params.integrationId} failed:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Integration not found',
            notFoundCode: 'INTEGRATION_NOT_FOUND',
            internalErrorMessage: 'Failed to delete integration',
            internalErrorCode: 'DELETE_INTEGRATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getIntegrationStatus)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getIntegrationStatus(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getIntegrationStatus,
      async ({ params }) => {
        try {
          const result = await this.organizationsService.getIntegrationStatus(
            req.user.organizationId,
            params.integrationId,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get integration status ${params.integrationId} failed:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Integration not found',
            notFoundCode: 'INTEGRATION_NOT_FOUND',
            internalErrorMessage: 'Failed to retrieve integration status',
            internalErrorCode: 'GET_INTEGRATION_STATUS_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Export & Backup
  // =============================================================================

  @TsRestHandler(organizationContract.requestExport)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.EXPORT)
  @RequireRoleLevel(50)
  public requestExport(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.requestExport,
      async ({ body }) => {
        try {
          const result = await this.organizationsService.requestExport(
            req.user.organizationId,
            body,
          );

          this.logger.log(`Export requested by user ${req.user.userId}`);

          return {
            status: 202 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Request export failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid export request',
            badRequestCode: 'INVALID_EXPORT_REQUEST',
            internalErrorMessage: 'Failed to request export',
            internalErrorCode: 'REQUEST_EXPORT_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getExports)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getExports(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getExports, async () => {
      try {
        const result = await this.organizationsService.getExports();

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get organization exports failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve organization exports',
          internalErrorCode: 'GET_ORGANIZATION_EXPORTS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.getExport)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getExport(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getExport, async ({ params }) => {
      try {
        const result = await this.organizationsService.getExport(
          req.user.organizationId,
          params.exportId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get export ${params.exportId} failed:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Export not found',
          notFoundCode: 'EXPORT_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve export',
          internalErrorCode: 'GET_EXPORT_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.createBackup)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.BACKUP)
  @RequireRoleLevel(50)
  public createBackup(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.createBackup,
      async ({ body }) => {
        try {
          const result = await this.organizationsService.createBackup(
            req.user.organizationId,
            body,
          );

          this.logger.log(`Backup created by user ${req.user.userId}`);

          return {
            status: 202 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Create backup failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid backup request',
            badRequestCode: 'INVALID_BACKUP_REQUEST',
            internalErrorMessage: 'Failed to create backup',
            internalErrorCode: 'CREATE_BACKUP_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Subscription & Billing
  // =============================================================================

  @TsRestHandler(organizationContract.getBilling)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getBilling(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getBilling, async () => {
      try {
        const result = await this.organizationsService.getBilling(
          req.user.organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get organization billing failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Organization not found',
          notFoundCode: 'ORGANIZATION_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve organization billing',
          internalErrorCode: 'GET_ORGANIZATION_BILLING_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.getUsage)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getUsage(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getUsage, async () => {
      try {
        const result = await this.organizationsService.getUsage(
          req.user.organizationId,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get organization usage failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Organization not found',
          notFoundCode: 'ORGANIZATION_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve organization usage',
          internalErrorCode: 'GET_ORGANIZATION_USAGE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.getPlans)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getPlans(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.getPlans, async () => {
      try {
        const result = await this.organizationsService.getPlans();

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Get subscription plans failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve subscription plans',
          internalErrorCode: 'GET_SUBSCRIPTION_PLANS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.subscribe)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public subscribe(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(organizationContract.subscribe, async ({ body }) => {
      try {
        const result = await this.organizationsService.subscribe(
          req.user.organizationId,
          body,
        );

        this.logger.log(`Organization subscribed by user ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error('Subscribe to plan failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid subscription data',
          badRequestCode: 'INVALID_SUBSCRIPTION_DATA',
          internalErrorMessage: 'Failed to subscribe to plan',
          internalErrorCode: 'SUBSCRIBE_TO_PLAN_FAILED',
        });
      }
    });
  }

  @TsRestHandler(organizationContract.updateSubscription)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public updateSubscription(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.updateSubscription,
      async ({ body }) => {
        try {
          const result = await this.organizationsService.updateSubscription(
            req.user.organizationId,
            body.data.attributes as { planId: string; billingCycle: string },
          );

          this.logger.log(`Subscription updated by user ${req.user.userId}`);

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Update subscription failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid subscription update data',
            badRequestCode: 'INVALID_SUBSCRIPTION_UPDATE',
            internalErrorMessage: 'Failed to update subscription',
            internalErrorCode: 'UPDATE_SUBSCRIPTION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getInvoices)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getInvoices(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getInvoices,
      async ({ query }) => {
        try {
          const result = await this.organizationsService.getInvoices(
            req.user.organizationId,
            query,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Get organization invoices failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            internalErrorMessage: 'Failed to retrieve organization invoices',
            internalErrorCode: 'GET_ORGANIZATION_INVOICES_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getInvoice)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getInvoice(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getInvoice,
      async ({ params }) => {
        try {
          const result = await this.organizationsService.getInvoice(
            req.user.organizationId,
            params.invoiceId,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(`Get invoice ${params.invoiceId} failed:`, error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Invoice not found',
            notFoundCode: 'INVOICE_NOT_FOUND',
            internalErrorMessage: 'Failed to retrieve invoice',
            internalErrorCode: 'GET_INVOICE_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Platform Admin Endpoints
  // =============================================================================

  @TsRestHandler(organizationContract.getOrganizations)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getOrganizations(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getOrganizations,
      async ({ query }) => {
        try {
          const result =
            await this.organizationsService.getOrganizations(query);

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Get organizations failed:', error);

          return ErrorResponseUtil.internalServerError(
            error,
            'Failed to retrieve organizations',
            'GET_ORGANIZATIONS_FAILED',
          );
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getOrganization)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.READ)
  public getOrganization(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getOrganization,
      async ({ params }) => {
        try {
          const result = await this.organizationsService.getOrganization(
            params.orgId,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(`Get organization ${params.orgId} failed:`, error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Organization not found',
            notFoundCode: 'ORGANIZATION_NOT_FOUND',
            internalErrorMessage: 'Failed to retrieve organization',
            internalErrorCode: 'GET_ORGANIZATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.createOrganization)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.CREATE)
  @RequireRoleLevel(50)
  public createOrganization(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.createOrganization,
      async ({ body }) => {
        try {
          const result =
            await this.organizationsService.createOrganization(body);

          this.logger.log(`Organization created by user ${req.user.userId}`);

          return {
            status: 201 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error('Create organization failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            badRequestMessage: 'Invalid organization data',
            badRequestCode: 'INVALID_ORGANIZATION_DATA',
            internalErrorMessage: 'Failed to create organization',
            internalErrorCode: 'CREATE_ORGANIZATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.updateOrganization)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.UPDATE)
  @RequireRoleLevel(50)
  public updateOrganization(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.updateOrganization,
      async ({ params, body }) => {
        try {
          const result = await this.organizationsService.updateOrganization(
            params.orgId,
            body,
          );

          this.logger.log(
            `Organization ${params.orgId} updated by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Update organization ${params.orgId} failed:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Organization not found',
            notFoundCode: 'ORGANIZATION_NOT_FOUND',
            badRequestMessage: 'Invalid organization data',
            badRequestCode: 'INVALID_ORGANIZATION_DATA',
            internalErrorMessage: 'Failed to update organization',
            internalErrorCode: 'UPDATE_ORGANIZATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.deleteOrganization)
  @RequirePermission(...PERMISSIONS.ORGANIZATIONS.DELETE)
  @RequireRoleLevel(50)
  public deleteOrganization(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.deleteOrganization,
      async ({ params }) => {
        try {
          const result = await this.organizationsService.deleteOrganization(
            params.orgId,
          );

          this.logger.log(
            `Organization ${params.orgId} deleted by user ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Delete organization ${params.orgId} failed:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Organization not found',
            notFoundCode: 'ORGANIZATION_NOT_FOUND',
            internalErrorMessage: 'Failed to delete organization',
            internalErrorCode: 'DELETE_ORGANIZATION_FAILED',
          });
        }
      },
    );
  }

  // =============================================================================
  // Team Invitations
  // =============================================================================

  @TsRestHandler(organizationContract.sendInvitation)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  @RequireRoleLevel(50)
  public sendInvitation(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.sendInvitation,
      async ({ body }) => {
        try {
          const result = await this.invitationService.sendInvitation({
            email: body.data.attributes.email,
            organizationId: req.user.organizationId!,
            roleName: body.data.attributes.role,
            teamRoleType: body.data.attributes.role as any,
            message: body.data.attributes.message,
            inviterName: req.user.name,
            inviterEmail: req.user.email,
          });

          this.logger.log(`Invitation sent to ${body.data.attributes.email} by user ${req.user.userId}`);

          return {
            status: 201 as const,
            body: {
              data: {
                id: result.id,
                type: 'invitations',
                attributes: {
                  email: result.email,
                  status: result.status,
                  sentAt: result.createdAt,
                  expiresAt: result.expiresAt,
                },
              },
            },
          };
        } catch (error: unknown) {
          this.logger.error('Send invitation failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            conflictMessage: 'User already exists or invitation already sent',
            conflictCode: 'INVITATION_CONFLICT',
            badRequestMessage: 'Invalid invitation data',
            badRequestCode: 'INVALID_INVITATION_DATA',
            internalErrorMessage: 'Failed to send invitation',
            internalErrorCode: 'SEND_INVITATION_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.getPendingInvitations)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  @RequireRoleLevel(50)
  public getPendingInvitations(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.getPendingInvitations,
      async () => {
        try {
          const invitations = await this.invitationService.getPendingInvitations(
            req.user.organizationId!,
          );

          this.logger.log(`Retrieved ${invitations.length} pending invitations for organization ${req.user.organizationId}`);

          return {
            status: 200 as const,
            body: {
              data: invitations.map(invitation => ({
                id: invitation.id,
                type: 'invitations',
                attributes: {
                  email: invitation.email,
                  status: invitation.status,
                  sentAt: invitation.createdAt,
                  expiresAt: invitation.expiresAt,
                  role: (invitation as any).roleName,
                  message: (invitation as any).message,
                },
              })),
            },
          };
        } catch (error: unknown) {
          this.logger.error('Get pending invitations failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            internalErrorMessage: 'Failed to retrieve invitations',
            internalErrorCode: 'GET_INVITATIONS_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(organizationContract.cancelInvitation)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  @RequireRoleLevel(50)
  public cancelInvitation(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.cancelInvitation,
      async ({ params }) => {
        try {
          await this.invitationService.cancelInvitation(
            params.id,
            req.user.organizationId!,
          );

          this.logger.log(`Cancelled invitation ${params.id} by user ${req.user.userId}`);

          return {
            status: 200 as const,
            body: {
              data: {
                id: params.id,
                type: 'invitations',
                attributes: {
                  message: 'Invitation cancelled successfully',
                },
              },
            },
          };
        } catch (error: unknown) {
          this.logger.error('Cancel invitation failed:', error);

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Invitation not found',
            notFoundCode: 'INVITATION_NOT_FOUND',
            internalErrorMessage: 'Failed to cancel invitation',
            internalErrorCode: 'CANCEL_INVITATION_FAILED',
          });
        }
      },
    );
  }
}
