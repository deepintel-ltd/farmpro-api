import { Controller, Body, Query, UseGuards, Header } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUser, GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  analyticsContract,
  BaseAnalyticsQuery,
  FinancialQuery,
  ActivityQuery,
  MarketQuery,
  FarmToMarketQuery,
  ExportRequest,
  ReportRequest
} from '../../contracts/analytics.contract';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPermissionsService } from './permissions.service';

@Controller()
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly permissionsService: AnalyticsPermissionsService
  ) {}

  @TsRestHandler(analyticsContract.getDashboard)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getDashboard(@Query() query: BaseAnalyticsQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getDashboard, async () => {
      // Check permissions
      await this.permissionsService.checkAnalyticsPermission(user, 'read');
      
      const result = await this.analyticsService.getDashboard(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getFinancialAnalytics)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getFinancialAnalytics(@Query() query: FinancialQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getFinancialAnalytics, async () => {
      // Check permissions
      await this.permissionsService.checkAnalyticsPermission(user, 'read');
      
      const result = await this.analyticsService.getFinancialAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getFarmToMarketAnalytics)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getFarmToMarketAnalytics(@Query() query: FarmToMarketQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getFarmToMarketAnalytics, async () => {
      // Check permissions
      await this.permissionsService.checkAnalyticsPermission(user, 'read');
      
      const result = await this.analyticsService.getFarmToMarketAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getActivityAnalytics)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getActivityAnalytics(@Query() query: ActivityQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getActivityAnalytics, async () => {
      // Check permissions
      await this.permissionsService.checkAnalyticsPermission(user, 'read');
      
      const result = await this.analyticsService.getActivityAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getMarketAnalytics)
  @Header('Cache-Control', 'public, max-age=300') // 5 minutes cache
  async getMarketAnalytics(@Query() query: MarketQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getMarketAnalytics, async () => {
      // Check permissions
      await this.permissionsService.checkAnalyticsPermission(user, 'read');
      
      const result = await this.analyticsService.getMarketAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getInsights)
  @Header('Cache-Control', 'public, max-age=600') // 10 minutes cache for AI insights
  async getInsights(@Query() query: BaseAnalyticsQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getInsights, async () => {
      // Check permissions
      await this.permissionsService.checkAnalyticsPermission(user, 'read');
      
      const result = await this.analyticsService.getInsights(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.exportAnalytics)
  async exportAnalytics(@Body() request: ExportRequest, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.exportAnalytics, async () => {
      // Check permissions
      await this.permissionsService.validateDataExportPermission(user);
      
      const result = await this.analyticsService.exportAnalytics(user, request);
      return {
        status: 202 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.generateReport)
  async generateReport(@Body() request: ReportRequest, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.generateReport, async () => {
      // Check permissions
      await this.permissionsService.validateDataExportPermission(user);
      
      const result = await this.analyticsService.generateReport(user, request);
      return {
        status: 202 as const,
        body: result
      };
    });
  }
}
