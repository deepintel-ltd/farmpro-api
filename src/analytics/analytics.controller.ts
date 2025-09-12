import { Controller, Body, Query, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  analyticsContract,
  BaseAnalyticsQuery,
  FinancialQuery,
  ActivityQuery,
  MarketQuery,
  ExportRequest
} from '../../contracts/analytics.contract';
import { AnalyticsService } from './analytics.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService
  ) {}

  @TsRestHandler(analyticsContract.getDashboard)
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
  async getFarmToMarketAnalytics(@Query() query: MarketQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getFarmToMarketAnalytics, async () => {
      const result = await this.analyticsService.getFarmToMarketAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.getActivityAnalytics)
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
  async getMarketAnalytics(@Query() query: MarketQuery, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.getMarketAnalytics, async () => {
      const result = await this.analyticsService.getMarketAnalytics(user, query);
      return {
        status: 200 as const,
        body: result
      };
    });
  }

  @TsRestHandler(analyticsContract.exportAnalytics)
  async exportAnalytics(@Body() request: ExportRequest, @GetCurrentUser() user: CurrentUser) {
    return tsRestHandler(analyticsContract.exportAnalytics, async () => {
      const result = await this.analyticsService.exportAnalytics(user, request);
      return {
        status: 202 as const,
        body: result
      };
    });
  }
}
