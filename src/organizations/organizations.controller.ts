import {
  Controller,
  UseGuards,
  Logger,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { organizationContract } from '../../contracts/organizations.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@ApiTags('organizations')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  private readonly logger = new Logger(OrganizationsController.name);

  constructor(private readonly organizationsService: OrganizationsService) {}

  // =============================================================================
  // Organization Profile & Settings
  // =============================================================================

  @TsRestHandler(organizationContract.getProfile)
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
  public updateProfile(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(
      organizationContract.updateProfile,
      async ({ body }) => {
        try {
          const result = await this.organizationsService.updateProfile(
            req.user.organizationId,
            body,
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
}
