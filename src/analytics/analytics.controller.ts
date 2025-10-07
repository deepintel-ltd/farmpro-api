import { Controller, Body, Query, UseGuards, Header } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUser, GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import {
  analyticsContract,
  BaseAnalyticsQuery,
  FinancialQuery,
  ActivityQuery,
  MarketQuery,
  FarmToMarketQuery,
  CustomerInsightsQuery,
  ExportRequest,
  ReportRequest
} from '../../contracts/analytics.contract';
import { AnalyticsService } from './analytics.service';
import {
  RequirePermission,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';

@Controller()
@Secured(FEATURES.ANALYTICS)
@UseGuards(RateLimitGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService
  ) {}

  @TsRestHandler(analyticsContract.getDashboard)
  @RequirePermission(...PERMISSIONS.ANALYTICS.READ)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getDashboard(@Query() query: BaseAnalyticsQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getDashboard, async () => {
      const result = await this.analyticsService.getDashboard(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getFinancialAnalytics)
  @RequirePermission(...PERMISSIONS.ANALYTICS.READ)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getFinancialAnalytics(@Query() query: FinancialQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getFinancialAnalytics, async () => {
      const result = await this.analyticsService.getFinancialAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getFarmToMarketAnalytics)
  @RequirePermission(...PERMISSIONS.ANALYTICS.READ)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getFarmToMarketAnalytics(@Query() query: FarmToMarketQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getFarmToMarketAnalytics, async () => {
      const result = await this.analyticsService.getFarmToMarketAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getActivityAnalytics)
  @RequirePermission(...PERMISSIONS.ANALYTICS.READ)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getActivityAnalytics(@Query() query: ActivityQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getActivityAnalytics, async () => {
      const result = await this.analyticsService.getActivityAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getMarketAnalytics)
  @RequirePermission(...PERMISSIONS.ANALYTICS.READ)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getMarketAnalytics(@Query() query: MarketQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getMarketAnalytics, async () => {
      const result = await this.analyticsService.getMarketAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getInsights)
  @RequirePermission(...PERMISSIONS.ANALYTICS.READ)
  @Header('Cache-Control', 'public, max-age=600') // 10 minutes cache for AI insights
  async getInsights(@Query() query: BaseAnalyticsQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getInsights, async () => {
      const result = await this.analyticsService.getInsights(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.exportAnalytics)
  @RequirePermission(...PERMISSIONS.ANALYTICS.EXPORT)
  @RequireRoleLevel(50)
  async exportAnalytics(@Body() request: ExportRequest, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.exportAnalytics, async () => {
      const result = await this.analyticsService.exportAnalytics(user, request);
      return {
        status: 202 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.generateReport)
  @RequirePermission(...PERMISSIONS.ANALYTICS.EXPORT)
  @RequireRoleLevel(50)
  async generateReport(@Body() request: ReportRequest, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.generateReport, async () => {
      const result = await this.analyticsService.generateReport(user, request);
      return {
        status: 202 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getCustomerInsights)
  @RequirePermission(...PERMISSIONS.ANALYTICS.READ)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getCustomerInsights(@Query() query: CustomerInsightsQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getCustomerInsights, async () => {
      const result = await this.analyticsService.getCustomerInsights(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }
}
