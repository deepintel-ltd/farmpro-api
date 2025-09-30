import { Controller, UseGuards, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationIsolationGuard } from '../common/guards/organization-isolation.guard';
import { FeatureAccessGuard } from '../common/guards/feature-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { marketContract } from '../../contracts/market.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import { AuthenticatedRequest } from '../common/types/authenticated-request';
import {
  RequireFeature,
  RequirePermission,
  RequireCapability,
  RequireRoleLevel,
  RequireOrgType,
} from '../common/decorators/authorization.decorators';

@ApiTags('market')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, OrganizationIsolationGuard, FeatureAccessGuard, PermissionsGuard)
@RequireFeature('marketplace')
@RequireOrgType('COMMODITY_TRADER', 'INTEGRATED_FARM')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);

  constructor(private readonly marketService: MarketService) {}

  // =============================================================================
  // Market Discovery & Browse
  // =============================================================================

  @TsRestHandler(marketContract.getMarketplaceCommodities)
  @RequirePermission('marketplace', 'browse')
  public getMarketplaceCommodities(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getMarketplaceCommodities, async ({ query }) => {
      try {
        const result = await this.marketService.getMarketplaceCommodities(req.user, query);
        this.logger.log(
          `Retrieved marketplace commodities for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get marketplace commodities failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve marketplace commodities',
          badRequestCode: 'GET_MARKETPLACE_COMMODITIES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.getMarketplaceSuppliers)
  @RequirePermission('marketplace', 'browse')
  public getMarketplaceSuppliers(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getMarketplaceSuppliers, async ({ query }) => {
      try {
        const result = await this.marketService.getMarketplaceSuppliers(req.user, query);
        this.logger.log(
          `Retrieved marketplace suppliers for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get marketplace suppliers failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve marketplace suppliers',
          badRequestCode: 'GET_MARKETPLACE_SUPPLIERS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.getMarketplaceSupplier)
  @RequirePermission('marketplace', 'browse')
  public getMarketplaceSupplier(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      marketContract.getMarketplaceSupplier,
      async ({ params }) => {
        try {
          const result = await this.marketService.getMarketplaceSupplier(
            req.user,
            params.supplierId,
          );
          this.logger.log(
            `Retrieved marketplace supplier ${params.supplierId} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get marketplace supplier failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Supplier not found',
            notFoundCode: 'SUPPLIER_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve marketplace supplier',
            badRequestCode: 'GET_MARKETPLACE_SUPPLIER_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(marketContract.getMarketplaceBuyers)
  @RequirePermission('marketplace', 'browse')
  public getMarketplaceBuyers(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getMarketplaceBuyers, async ({ query }) => {
      try {
        const result = await this.marketService.getMarketplaceBuyers(req.user, query);
        this.logger.log(
          `Retrieved marketplace buyers for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get marketplace buyers failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve marketplace buyers',
          badRequestCode: 'GET_MARKETPLACE_BUYERS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.searchMarketplace)
  @RequirePermission('marketplace', 'browse')
  public searchMarketplace(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.searchMarketplace, async ({ body }) => {
      try {
        const result = await this.marketService.searchMarketplace(req.user, body);
        this.logger.log(
          `Performed marketplace search for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Marketplace search failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to perform marketplace search',
          badRequestCode: 'MARKETPLACE_SEARCH_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Market Intelligence & Pricing
  // =============================================================================

  @TsRestHandler(marketContract.getPriceTrends)
  @RequirePermission('marketplace', 'browse')
  public getPriceTrends(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getPriceTrends, async ({ query }) => {
      try {
        const result = await this.marketService.getPriceTrends(req.user, query);
        this.logger.log(
          `Retrieved price trends for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get price trends failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve price trends',
          badRequestCode: 'GET_PRICE_TRENDS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.getPriceAlerts)
  @RequirePermission('marketplace', 'browse')
  public getPriceAlerts(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getPriceAlerts, async () => {
      try {
        const result = await this.marketService.getPriceAlerts(req.user);
        this.logger.log(
          `Retrieved price alerts for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get price alerts failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve price alerts',
          badRequestCode: 'GET_PRICE_ALERTS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.createPriceAlert)
  @RequirePermission('marketplace', 'create')
  public createPriceAlert(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.createPriceAlert, async ({ body }) => {
      try {
        const result = await this.marketService.createPriceAlert(req.user, body);
        this.logger.log(
          `Created price alert for user: ${req.user.userId}`,
        );

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Create price alert failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to create price alert',
          badRequestCode: 'CREATE_PRICE_ALERT_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.deletePriceAlert)
  @RequirePermission('marketplace', 'delete')
  public deletePriceAlert(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      marketContract.deletePriceAlert,
      async ({ params }) => {
        try {
          const result = await this.marketService.deletePriceAlert(
            req.user,
            params.alertId,
          );
          this.logger.log(
            `Deleted price alert ${params.alertId} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Delete price alert failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Price alert not found',
            notFoundCode: 'PRICE_ALERT_NOT_FOUND',
            badRequestMessage: 'Failed to delete price alert',
            badRequestCode: 'DELETE_PRICE_ALERT_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(marketContract.getMarketAnalysis)
  @RequirePermission('marketplace', 'browse')
  public getMarketAnalysis(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getMarketAnalysis, async ({ query }) => {
      try {
        const result = await this.marketService.getMarketAnalysis(req.user, query);
        this.logger.log(
          `Retrieved market analysis for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get market analysis failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve market analysis',
          badRequestCode: 'GET_MARKET_ANALYSIS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Demand & Supply Matching
  // =============================================================================

  @TsRestHandler(marketContract.getDemandForecast)
  @RequirePermission('marketplace', 'browse')
  public getDemandForecast(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getDemandForecast, async ({ query }) => {
      try {
        const result = await this.marketService.getDemandForecast(req.user, query);
        this.logger.log(
          `Retrieved demand forecast for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get demand forecast failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve demand forecast',
          badRequestCode: 'GET_DEMAND_FORECAST_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.getSupplyOpportunities)
  @RequirePermission('marketplace', 'browse')
  public getSupplyOpportunities(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getSupplyOpportunities, async ({ query }) => {
      try {
        const result = await this.marketService.getSupplyOpportunities(req.user, query);
        this.logger.log(
          `Retrieved supply opportunities for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get supply opportunities failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve supply opportunities',
          badRequestCode: 'GET_SUPPLY_OPPORTUNITIES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.getBuyingOpportunities)
  @RequirePermission('marketplace', 'browse')
  public getBuyingOpportunities(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getBuyingOpportunities, async ({ query }) => {
      try {
        const result = await this.marketService.getBuyingOpportunities(req.user, query);
        this.logger.log(
          `Retrieved buying opportunities for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get buying opportunities failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve buying opportunities',
          badRequestCode: 'GET_BUYING_OPPORTUNITIES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.createMatchRequest)
  @RequirePermission('marketplace', 'create')
  public createMatchRequest(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.createMatchRequest, async ({ body }) => {
      try {
        const result = await this.marketService.createMatchRequest(req.user, body);
        this.logger.log(
          `Created match request for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Create match request failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to create match request',
          badRequestCode: 'CREATE_MATCH_REQUEST_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Contract Templates & Standards
  // =============================================================================

  @TsRestHandler(marketContract.getContractTemplates)
  @RequirePermission('marketplace', 'browse')
  public getContractTemplates(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getContractTemplates, async ({ query }) => {
      try {
        const result = await this.marketService.getContractTemplates(req.user, query);
        this.logger.log(
          `Retrieved contract templates for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get contract templates failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve contract templates',
          badRequestCode: 'GET_CONTRACT_TEMPLATES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.getContractTemplate)
  @RequirePermission('marketplace', 'browse')
  public getContractTemplate(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      marketContract.getContractTemplate,
      async ({ params }) => {
        try {
          const result = await this.marketService.getContractTemplate(
            req.user,
            params.templateId,
          );
          this.logger.log(
            `Retrieved contract template ${params.templateId} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get contract template failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Contract template not found',
            notFoundCode: 'CONTRACT_TEMPLATE_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve contract template',
            badRequestCode: 'GET_CONTRACT_TEMPLATE_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(marketContract.generateContract)
  @RequirePermission('marketplace', 'generate_contract')
  @RequireRoleLevel(50)
  public generateContract(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.generateContract, async ({ body }) => {
      try {
        const result = await this.marketService.generateContract(req.user, body);
        this.logger.log(
          `Generated contract for user: ${req.user.userId}`,
        );

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Generate contract failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to generate contract',
          badRequestCode: 'GENERATE_CONTRACT_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Market Participation & Listings
  // =============================================================================

  @TsRestHandler(marketContract.getMyListings)
  @RequirePermission('marketplace', 'read')
  public getMyListings(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.getMyListings, async ({ query }) => {
      try {
        const result = await this.marketService.getMyListings(req.user, query);
        this.logger.log(
          `Retrieved user listings for user: ${req.user.userId}`,
        );

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get user listings failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve user listings',
          badRequestCode: 'GET_USER_LISTINGS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.createListing)
  @RequirePermission('marketplace', 'create_listing')
  @RequireCapability('create_orders')
  public createListing(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(marketContract.createListing, async ({ body }) => {
      try {
        const result = await this.marketService.createListing(req.user, body);
        this.logger.log(
          `Created marketplace listing for user: ${req.user.userId}`,
        );

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Create marketplace listing failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to create marketplace listing',
          badRequestCode: 'CREATE_MARKETPLACE_LISTING_FAILED',
        });
      }
    });
  }

  @TsRestHandler(marketContract.updateListing)
  @RequirePermission('marketplace', 'update')
  public updateListing(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      marketContract.updateListing,
      async ({ params, body }) => {
        try {
          const result = await this.marketService.updateListing(
            req.user,
            params.listingId,
            body,
          );
          this.logger.log(
            `Updated marketplace listing ${params.listingId} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Update marketplace listing failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Marketplace listing not found',
            notFoundCode: 'MARKETPLACE_LISTING_NOT_FOUND',
            badRequestMessage: 'Failed to update marketplace listing',
            badRequestCode: 'UPDATE_MARKETPLACE_LISTING_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(marketContract.deleteListing)
  @RequirePermission('marketplace', 'delete')
  public deleteListing(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      marketContract.deleteListing,
      async ({ params }) => {
        try {
          const result = await this.marketService.deleteListing(
            req.user,
            params.listingId,
          );
          this.logger.log(
            `Deleted marketplace listing ${params.listingId} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Delete marketplace listing failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Marketplace listing not found',
            notFoundCode: 'MARKETPLACE_LISTING_NOT_FOUND',
            badRequestMessage: 'Failed to delete marketplace listing',
            badRequestCode: 'DELETE_MARKETPLACE_LISTING_FAILED',
          });
        }
      },
    );
  }

  @TsRestHandler(marketContract.getListing)
  @RequirePermission('marketplace', 'browse')
  public getListing(
    @Request() req: AuthenticatedRequest,
  ) {
    return tsRestHandler(
      marketContract.getListing,
      async ({ params }) => {
        try {
          const result = await this.marketService.getListing(
            req.user,
            params.listingId,
          );
          this.logger.log(
            `Retrieved marketplace listing ${params.listingId} for user: ${req.user.userId}`,
          );

          return {
            status: 200 as const,
            body: result,
          };
        } catch (error: unknown) {
          this.logger.error(
            `Get marketplace listing failed for user ${req.user.userId}:`,
            error,
          );

          return ErrorResponseUtil.handleCommonError(error, {
            notFoundMessage: 'Marketplace listing not found',
            notFoundCode: 'MARKETPLACE_LISTING_NOT_FOUND',
            badRequestMessage: 'Failed to retrieve marketplace listing',
            badRequestCode: 'GET_MARKETPLACE_LISTING_FAILED',
          });
        }
      },
    );
  }
}
