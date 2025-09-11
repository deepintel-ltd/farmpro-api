import { Controller, UseGuards, Logger } from '@nestjs/common';
import { tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { analyticsContract } from '../../contracts/analytics.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  // =============================================================================
  // Cross-Platform Dashboard Analytics
  // =============================================================================

  public getDashboard(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getDashboard, async ({ query }) => {
      try {
        const result = await this.analyticsService.getDashboard(req.user, query as any);
        this.logger.log(`Retrieved dashboard analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get dashboard analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve dashboard analytics',
          badRequestCode: 'GET_DASHBOARD_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getFarmToMarket(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getFarmToMarket, async () => {
      try {
        const result = await this.analyticsService.getFarmToMarket(req.user);
        this.logger.log(`Retrieved farm-to-market analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get farm-to-market analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve farm-to-market analytics',
          badRequestCode: 'GET_FARM_TO_MARKET_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getProfitability(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getProfitability, async ({ query }) => {
      try {
        const result = await this.analyticsService.getProfitability(req.user, query as any);
        this.logger.log(`Retrieved profitability analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get profitability analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve profitability analytics',
          badRequestCode: 'GET_PROFITABILITY_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getROIAnalysis(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getROIAnalysis, async ({ query }) => {
      try {
        const result = await this.analyticsService.getROIAnalysis(req.user, query as any);
        this.logger.log(`Retrieved ROI analysis for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get ROI analysis failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve ROI analysis',
          badRequestCode: 'GET_ROI_ANALYSIS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Production vs Market Performance
  // =============================================================================

  public getYieldVsMarket(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getYieldVsMarket, async () => {
      try {
        const result = await this.analyticsService.getYieldVsMarket(req.user);
        this.logger.log(`Retrieved yield vs market analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get yield vs market analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve yield vs market analytics',
          badRequestCode: 'GET_YIELD_VS_MARKET_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getQualityPremium(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getQualityPremium, async ({ query }) => {
      try {
        const result = await this.analyticsService.getQualityPremium(req.user, query as any);
        this.logger.log(`Retrieved quality premium analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get quality premium analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve quality premium analytics',
          badRequestCode: 'GET_QUALITY_PREMIUM_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getTimingAnalysis(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getTimingAnalysis, async ({ query }) => {
      try {
        const result = await this.analyticsService.getTimingAnalysis(req.user, query as any);
        this.logger.log(`Retrieved timing analysis for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get timing analysis failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve timing analysis',
          badRequestCode: 'GET_TIMING_ANALYSIS_FAILED',
        });
      }
    });
  }

  public getDirectVsIntermediary(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getDirectVsIntermediary, async ({ query }) => {
      try {
        const result = await this.analyticsService.getDirectVsIntermediary(req.user, query as any);
        this.logger.log(`Retrieved direct vs intermediary analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get direct vs intermediary analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve direct vs intermediary analytics',
          badRequestCode: 'GET_DIRECT_VS_INTERMEDIARY_ANALYTICS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Operational Efficiency Analytics
  // =============================================================================

  public getActivityEfficiency(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getActivityEfficiency, async ({ query }) => {
      try {
        const result = await this.analyticsService.getActivityEfficiency(req.user, query as any);
        this.logger.log(`Retrieved activity efficiency analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get activity efficiency analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve activity efficiency analytics',
          badRequestCode: 'GET_ACTIVITY_EFFICIENCY_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getResourceUtilization(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getResourceUtilization, async ({ query }) => {
      try {
        const result = await this.analyticsService.getResourceUtilization(req.user, query as any);
        this.logger.log(`Retrieved resource utilization analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get resource utilization analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve resource utilization analytics',
          badRequestCode: 'GET_RESOURCE_UTILIZATION_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getCostOptimization(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getCostOptimization, async ({ query }) => {
      try {
        const result = await this.analyticsService.getCostOptimization(req.user, query as any);
        this.logger.log(`Retrieved cost optimization analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get cost optimization analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve cost optimization analytics',
          badRequestCode: 'GET_COST_OPTIMIZATION_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getWorkflowAnalysis(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getWorkflowAnalysis, async ({ query }) => {
      try {
        const result = await this.analyticsService.getWorkflowAnalysis(req.user, query as any);
        this.logger.log(`Retrieved workflow analysis for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get workflow analysis failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve workflow analysis',
          badRequestCode: 'GET_WORKFLOW_ANALYSIS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Market Intelligence & Competitiveness
  // =============================================================================

  public getMarketPositioning(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getMarketPositioning, async ({ query }) => {
      try {
        const result = await this.analyticsService.getMarketPositioning(req.user, query as any);
        this.logger.log(`Retrieved market positioning analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get market positioning analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve market positioning analytics',
          badRequestCode: 'GET_MARKET_POSITIONING_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getCustomerAnalysis(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getCustomerAnalysis, async ({ query }) => {
      try {
        const result = await this.analyticsService.getCustomerAnalysis(req.user, query as any);
        this.logger.log(`Retrieved customer analysis for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get customer analysis failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve customer analysis',
          badRequestCode: 'GET_CUSTOMER_ANALYSIS_FAILED',
        });
      }
    });
  }

  public getSupplierPerformance(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getSupplierPerformance, async ({ query }) => {
      try {
        const result = await this.analyticsService.getSupplierPerformance(req.user, query as any);
        this.logger.log(`Retrieved supplier performance analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get supplier performance analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve supplier performance analytics',
          badRequestCode: 'GET_SUPPLIER_PERFORMANCE_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getPriceRealization(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getPriceRealization, async ({ query }) => {
      try {
        const result = await this.analyticsService.getPriceRealization(req.user, query as any);
        this.logger.log(`Retrieved price realization analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get price realization analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve price realization analytics',
          badRequestCode: 'GET_PRICE_REALIZATION_ANALYTICS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Predictive Analytics & Forecasting
  // =============================================================================

  public getDemandPrediction(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getDemandPrediction, async ({ query }) => {
      try {
        const result = await this.analyticsService.getDemandPrediction(req.user, query as any);
        this.logger.log(`Retrieved demand prediction for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get demand prediction failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve demand prediction',
          badRequestCode: 'GET_DEMAND_PREDICTION_FAILED',
        });
      }
    });
  }

  public getYieldPrediction(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getYieldPrediction, async ({ query }) => {
      try {
        const result = await this.analyticsService.getYieldPrediction(req.user, query as any);
        this.logger.log(`Retrieved yield prediction for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get yield prediction failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve yield prediction',
          badRequestCode: 'GET_YIELD_PREDICTION_FAILED',
        });
      }
    });
  }

  public getPriceForecasting(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getPriceForecasting, async ({ query }) => {
      try {
        const result = await this.analyticsService.getPriceForecasting(req.user, query as any);
        this.logger.log(`Retrieved price forecasting for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get price forecasting failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve price forecasting',
          badRequestCode: 'GET_PRICE_FORECASTING_FAILED',
        });
      }
    });
  }

  public getRiskAssessment(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getRiskAssessment, async ({ query }) => {
      try {
        const result = await this.analyticsService.getRiskAssessment(req.user, query as any);
        this.logger.log(`Retrieved risk assessment for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get risk assessment failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve risk assessment',
          badRequestCode: 'GET_RISK_ASSESSMENT_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Sustainability & Impact Analytics
  // =============================================================================

  public getSustainabilityMetrics(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getSustainabilityMetrics, async ({ query }) => {
      try {
        const result = await this.analyticsService.getSustainabilityMetrics(req.user, query as any);
        this.logger.log(`Retrieved sustainability metrics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get sustainability metrics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve sustainability metrics',
          badRequestCode: 'GET_SUSTAINABILITY_METRICS_FAILED',
        });
      }
    });
  }

  public getCertificationImpact(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getCertificationImpact, async ({ query }) => {
      try {
        const result = await this.analyticsService.getCertificationImpact(req.user, query as any);
        this.logger.log(`Retrieved certification impact analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get certification impact analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve certification impact analytics',
          badRequestCode: 'GET_CERTIFICATION_IMPACT_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getWasteReduction(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getWasteReduction, async ({ query }) => {
      try {
        const result = await this.analyticsService.getWasteReduction(req.user, query as any);
        this.logger.log(`Retrieved waste reduction analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get waste reduction analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve waste reduction analytics',
          badRequestCode: 'GET_WASTE_REDUCTION_ANALYTICS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Comparative & Benchmarking Analytics
  // =============================================================================

  public getPeerBenchmarking(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getPeerBenchmarking, async ({ query }) => {
      try {
        const result = await this.analyticsService.getPeerBenchmarking(req.user, query as any);
        this.logger.log(`Retrieved peer benchmarking analytics for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get peer benchmarking analytics failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve peer benchmarking analytics',
          badRequestCode: 'GET_PEER_BENCHMARKING_ANALYTICS_FAILED',
        });
      }
    });
  }

  public getIndustryBenchmarks(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getIndustryBenchmarks, async ({ query }) => {
      try {
        const result = await this.analyticsService.getIndustryBenchmarks(req.user, query as any);
        this.logger.log(`Retrieved industry benchmarks for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get industry benchmarks failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve industry benchmarks',
          badRequestCode: 'GET_INDUSTRY_BENCHMARKS_FAILED',
        });
      }
    });
  }

  public getHistoricalComparison(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getHistoricalComparison, async ({ query }) => {
      try {
        const result = await this.analyticsService.getHistoricalComparison(req.user, query as any);
        this.logger.log(`Retrieved historical comparison for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get historical comparison failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve historical comparison',
          badRequestCode: 'GET_HISTORICAL_COMPARISON_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Custom Analytics & Data Science
  // =============================================================================

  public executeCustomQuery(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.executeCustomQuery, async () => {
      try {
        const result = await this.analyticsService.executeCustomQuery(req.user);
        this.logger.log(`Executed custom query for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Execute custom query failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to execute custom query',
          badRequestCode: 'EXECUTE_CUSTOM_QUERY_FAILED',
        });
      }
    });
  }

  public getDataExports(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getDataExports, async () => {
      try {
        const result = await this.analyticsService.getDataExports(req.user);
        this.logger.log(`Retrieved data exports for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result as any,
        };
      } catch (error: unknown) {
        this.logger.error(`Get data exports failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve data exports',
          badRequestCode: 'GET_DATA_EXPORTS_FAILED',
        });
      }
    });
  }

  public createDataExport(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.createDataExport, async () => {
      try {
        const result = await this.analyticsService.createDataExport(req.user);
        this.logger.log(`Created data export for user: ${req.user.userId}`);

        return {
          status: 202 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Create data export failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to create data export',
          badRequestCode: 'CREATE_DATA_EXPORT_FAILED',
        });
      }
    });
  }

  public getInsights(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getInsights, async () => {
      try {
        const result = await this.analyticsService.getInsights(req.user);
        this.logger.log(`Retrieved insights for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get insights failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve insights',
          badRequestCode: 'GET_INSIGHTS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Report Generation & Scheduling
  // =============================================================================

  public getReportTemplates(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getReportTemplates, async () => {
      try {
        const result = await this.analyticsService.getReportTemplates(req.user);
        this.logger.log(`Retrieved report templates for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get report templates failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve report templates',
          badRequestCode: 'GET_REPORT_TEMPLATES_FAILED',
        });
      }
    });
  }

  public generateReport(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.generateReport, async () => {
      try {
        const result = await this.analyticsService.generateReport(req.user);
        this.logger.log(`Generated report for user: ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Generate report failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to generate report',
          badRequestCode: 'GENERATE_REPORT_FAILED',
        });
      }
    });
  }

  public getReports(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getReports, async () => {
      try {
        const result = await this.analyticsService.getReports(req.user);
        this.logger.log(`Retrieved reports for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get reports failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve reports',
          badRequestCode: 'GET_REPORTS_FAILED',
        });
      }
    });
  }

  public getReport(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getReport, async ({ params }) => {
      try {
        const result = await this.analyticsService.getReport(req.user, params.reportId);
        this.logger.log(`Retrieved report ${params.reportId} for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get report failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Report not found',
          notFoundCode: 'REPORT_NOT_FOUND',
          badRequestMessage: 'Failed to retrieve report',
          badRequestCode: 'GET_REPORT_FAILED',
        });
      }
    });
  }

  public scheduleReport(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.scheduleReport, async () => {
      try {
        const result = await this.analyticsService.scheduleReport(req.user);
        this.logger.log(`Scheduled report for user: ${req.user.userId}`);

        return {
          status: 201 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Schedule report failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to schedule report',
          badRequestCode: 'SCHEDULE_REPORT_FAILED',
        });
      }
    });
  }

  public getScheduledReports(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.getScheduledReports, async () => {
      try {
        const result = await this.analyticsService.getScheduledReports(req.user);
        this.logger.log(`Retrieved scheduled reports for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Get scheduled reports failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to retrieve scheduled reports',
          badRequestCode: 'GET_SCHEDULED_REPORTS_FAILED',
        });
      }
    });
  }

  public cancelScheduledReport(req: AuthenticatedRequest) {
    return tsRestHandler(analyticsContract.cancelScheduledReport, async ({ params }) => {
      try {
        const result = await this.analyticsService.cancelScheduledReport(req.user, params.scheduleId);
        this.logger.log(`Cancelled scheduled report ${params.scheduleId} for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(`Cancel scheduled report failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Scheduled report not found',
          notFoundCode: 'SCHEDULED_REPORT_NOT_FOUND',
          badRequestMessage: 'Failed to cancel scheduled report',
          badRequestCode: 'CANCEL_SCHEDULED_REPORT_FAILED',
        });
      }
    });
  }
}
