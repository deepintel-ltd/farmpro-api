import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  DashboardAnalyticsQuerySchema,
  FarmToMarketQuerySchema,
  ProfitabilityQuerySchema,
  ROIAnalysisQuerySchema,
  YieldVsMarketQuerySchema,
  QualityPremiumQuerySchema,
  TimingAnalysisQuerySchema,
  DirectVsIntermediaryQuerySchema,
  ActivityEfficiencyQuerySchema,
  ResourceUtilizationQuerySchema,
  CostOptimizationQuerySchema,
  WorkflowAnalysisQuerySchema,
  MarketPositioningQuerySchema,
  CustomerAnalysisQuerySchema,
  SupplierPerformanceQuerySchema,
  PriceRealizationQuerySchema,
  DemandPredictionQuerySchema,
  YieldPredictionQuerySchema,
  PriceForecastingQuerySchema,
  RiskAssessmentQuerySchema,
  SustainabilityMetricsQuerySchema,
  CertificationImpactQuerySchema,
  WasteReductionQuerySchema,
  PeerBenchmarkingQuerySchema,
  IndustryBenchmarksQuerySchema,
  HistoricalComparisonQuerySchema,
  CustomQueryRequestSchema,
  DataExportRequestSchema,
  InsightsQuerySchema,
  ReportGenerationRequestSchema,
  ReportScheduleRequestSchema,
  ReportsQuerySchema,
  AnalyticsDashboardResponseSchema,
  AnalyticsReportsResponseSchema,
  AnalyticsExportsResponseSchema,
  AnalyticsInsightsResponseSchema,
} from './analytics.schemas';
import {
  CommonQueryParams,
  CommonErrorResponses,
  CollectionErrorResponses,
  UuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Analytics Contracts
// =============================================================================

export const analyticsContract = c.router({
  // =============================================================================
  // Cross-Platform Dashboard Analytics
  // =============================================================================

  getDashboard: {
    method: 'GET',
    path: '/api/analytics/dashboard',
    query: DashboardAnalyticsQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get unified analytics dashboard',
  },

  getFarmToMarket: {
    method: 'GET',
    path: '/api/analytics/farm-to-market',
    query: FarmToMarketQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get farm-to-market journey analytics',
  },

  getProfitability: {
    method: 'GET',
    path: '/api/analytics/profitability',
    query: ProfitabilityQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get integrated profitability analysis',
  },

  getROIAnalysis: {
    method: 'GET',
    path: '/api/analytics/roi-analysis',
    query: ROIAnalysisQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get return on investment analysis',
  },

  // =============================================================================
  // Production vs Market Performance
  // =============================================================================

  getYieldVsMarket: {
    method: 'GET',
    path: '/api/analytics/yield-vs-market',
    query: YieldVsMarketQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Compare yield performance to market opportunities',
  },

  getQualityPremium: {
    method: 'GET',
    path: '/api/analytics/quality-premium',
    query: QualityPremiumQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze quality premium capture',
  },

  getTimingAnalysis: {
    method: 'GET',
    path: '/api/analytics/timing-analysis',
    query: TimingAnalysisQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze market timing effectiveness',
  },

  getDirectVsIntermediary: {
    method: 'GET',
    path: '/api/analytics/direct-vs-intermediary',
    query: DirectVsIntermediaryQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Compare direct sales vs intermediary channels',
  },

  // =============================================================================
  // Operational Efficiency Analytics
  // =============================================================================

  getActivityEfficiency: {
    method: 'GET',
    path: '/api/analytics/activity-efficiency',
    query: ActivityEfficiencyQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get farm activity efficiency metrics',
  },

  getResourceUtilization: {
    method: 'GET',
    path: '/api/analytics/resource-utilization',
    query: ResourceUtilizationQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze resource utilization across operations',
  },

  getCostOptimization: {
    method: 'GET',
    path: '/api/analytics/cost-optimization',
    query: CostOptimizationQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get cost optimization opportunities',
  },

  getWorkflowAnalysis: {
    method: 'GET',
    path: '/api/analytics/workflow-analysis',
    query: WorkflowAnalysisQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze workflow efficiency',
  },

  // =============================================================================
  // Market Intelligence & Competitiveness
  // =============================================================================

  getMarketPositioning: {
    method: 'GET',
    path: '/api/analytics/market-positioning',
    query: MarketPositioningQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze competitive market position',
  },

  getCustomerAnalysis: {
    method: 'GET',
    path: '/api/analytics/customer-analysis',
    query: CustomerAnalysisQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze customer relationships and performance',
  },

  getSupplierPerformance: {
    method: 'GET',
    path: '/api/analytics/supplier-performance',
    query: SupplierPerformanceQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze supplier relationships (for buyers)',
  },

  getPriceRealization: {
    method: 'GET',
    path: '/api/analytics/price-realization',
    query: PriceRealizationQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze price realization vs market benchmarks',
  },

  // =============================================================================
  // Predictive Analytics & Forecasting
  // =============================================================================

  getDemandPrediction: {
    method: 'GET',
    path: '/api/analytics/demand-prediction',
    query: DemandPredictionQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get demand forecasting for planning',
  },

  getYieldPrediction: {
    method: 'GET',
    path: '/api/analytics/yield-prediction',
    query: YieldPredictionQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get yield forecasting for current crops',
  },

  getPriceForecasting: {
    method: 'GET',
    path: '/api/analytics/price-forecasting',
    query: PriceForecastingQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get price forecasting and market outlook',
  },

  getRiskAssessment: {
    method: 'GET',
    path: '/api/analytics/risk-assessment',
    query: RiskAssessmentQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get integrated risk analysis',
  },

  // =============================================================================
  // Sustainability & Impact Analytics
  // =============================================================================

  getSustainabilityMetrics: {
    method: 'GET',
    path: '/api/analytics/sustainability-metrics',
    query: SustainabilityMetricsQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get sustainability and environmental impact',
  },

  getCertificationImpact: {
    method: 'GET',
    path: '/api/analytics/certification-impact',
    query: CertificationImpactQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze certification program impact',
  },

  getWasteReduction: {
    method: 'GET',
    path: '/api/analytics/waste-reduction',
    query: WasteReductionQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Analyze waste reduction and efficiency',
  },

  // =============================================================================
  // Comparative & Benchmarking Analytics
  // =============================================================================

  getPeerBenchmarking: {
    method: 'GET',
    path: '/api/analytics/peer-benchmarking',
    query: PeerBenchmarkingQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Compare performance to peer farms',
  },

  getIndustryBenchmarks: {
    method: 'GET',
    path: '/api/analytics/industry-benchmarks',
    query: IndustryBenchmarksQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get industry benchmark comparisons',
  },

  getHistoricalComparison: {
    method: 'GET',
    path: '/api/analytics/historical-comparison',
    query: HistoricalComparisonQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Compare current vs historical performance',
  },

  // =============================================================================
  // Custom Analytics & Data Science
  // =============================================================================

  executeCustomQuery: {
    method: 'POST',
    path: '/api/analytics/custom-query',
    body: CustomQueryRequestSchema,
    responses: {
      200: AnalyticsDashboardResponseSchema,
      ...CommonErrorResponses,
    },
    summary: 'Execute custom analytics query',
  },

  getDataExports: {
    method: 'GET',
    path: '/api/analytics/data-exports',
    query: CommonQueryParams,
    responses: {
      200: AnalyticsExportsResponseSchema,
      ...CollectionErrorResponses,
    },
    summary: 'List available data exports',
  },

  createDataExport: {
    method: 'POST',
    path: '/api/analytics/data-exports',
    body: DataExportRequestSchema,
    responses: {
      202: z.object({
        data: z.object({
          type: z.literal('analytics_export'),
          id: z.string().uuid(),
          attributes: z.object({
            status: z.literal('pending'),
            message: z.string(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Create analytics data export',
  },

  getInsights: {
    method: 'GET',
    path: '/api/analytics/insights',
    query: InsightsQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsInsightsResponseSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get AI-generated insights and recommendations',
  },

  // =============================================================================
  // Report Generation & Scheduling
  // =============================================================================

  getReportTemplates: {
    method: 'GET',
    path: '/api/analytics/reports/templates',
    query: CommonQueryParams,
    responses: {
      200: z.object({
        data: z.array(z.object({
          type: z.literal('report_template'),
          id: z.string().uuid(),
          attributes: z.object({
            name: z.string(),
            description: z.string(),
            category: z.string(),
            parameters: z.array(z.object({
              name: z.string(),
              type: z.string(),
              required: z.boolean(),
              options: z.array(z.string()).optional(),
            })),
            isCustom: z.boolean(),
            createdAt: z.string().datetime(),
          }),
        })),
      }),
      ...CollectionErrorResponses,
    },
    summary: 'List available report templates',
  },

  generateReport: {
    method: 'POST',
    path: '/api/analytics/reports/generate',
    body: ReportGenerationRequestSchema,
    responses: {
      201: z.object({
        data: z.object({
          type: z.literal('analytics_report'),
          id: z.string().uuid(),
          attributes: z.object({
            status: z.literal('pending'),
            message: z.string(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Generate comprehensive analytics report',
  },

  getReports: {
    method: 'GET',
    path: '/api/analytics/reports',
    query: ReportsQuerySchema.merge(CommonQueryParams),
    responses: {
      200: AnalyticsReportsResponseSchema,
      ...CollectionErrorResponses,
    },
    summary: 'List generated reports',
  },

  getReport: {
    method: 'GET',
    path: '/api/analytics/reports/:reportId',
    pathParams: UuidPathParam('Report'),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('analytics_report'),
          id: z.string().uuid(),
          attributes: z.object({
            title: z.string(),
            type: z.string(),
            status: z.enum(['pending', 'generating', 'completed', 'failed']),
            format: z.enum(['pdf', 'html', 'excel']),
            createdAt: z.string().datetime(),
            completedAt: z.string().datetime().optional(),
            downloadUrl: z.string().url().optional(),
            fileSize: z.number().optional(),
            recipients: z.array(z.string().email()),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Download or view specific report',
  },

  scheduleReport: {
    method: 'POST',
    path: '/api/analytics/reports/schedule',
    body: ReportScheduleRequestSchema,
    responses: {
      201: z.object({
        data: z.object({
          type: z.literal('report_schedule'),
          id: z.string().uuid(),
          attributes: z.object({
            status: z.literal('active'),
            message: z.string(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Schedule recurring report',
  },

  getScheduledReports: {
    method: 'GET',
    path: '/api/analytics/reports/scheduled',
    query: CommonQueryParams,
    responses: {
      200: z.object({
        data: z.array(z.object({
          type: z.literal('report_schedule'),
          id: z.string().uuid(),
          attributes: z.object({
            reportConfig: z.record(z.any()),
            schedule: z.object({
              frequency: z.enum(['weekly', 'monthly', 'quarterly']),
              dayOfWeek: z.number().int().min(0).max(6).optional(),
              dayOfMonth: z.number().int().min(1).max(31).optional(),
              time: z.string(),
              timezone: z.string(),
            }),
            recipients: z.array(z.string().email()),
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
            nextRun: z.string().datetime().optional(),
          }),
        })),
      }),
      ...CollectionErrorResponses,
    },
    summary: 'List scheduled reports',
  },

  cancelScheduledReport: {
    method: 'DELETE',
    path: '/api/analytics/reports/scheduled/:scheduleId',
    pathParams: UuidPathParam('Schedule'),
    body: c.noBody(),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('report_schedule'),
          id: z.string().uuid(),
          attributes: z.object({
            status: z.literal('cancelled'),
            message: z.string(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Cancel scheduled report',
  },
});

// =============================================================================
// Type Exports
// =============================================================================

export type AnalyticsContract = typeof analyticsContract;
