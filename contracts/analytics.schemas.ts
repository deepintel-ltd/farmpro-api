import { z } from 'zod';

// =============================================================================
// Analytics Query Parameters
// =============================================================================

export const AnalyticsPeriodSchema = z.enum(['day', 'week', 'month', 'quarter', 'year']);

export const AnalyticsComparisonSchema = z.enum(['previous_period', 'same_period_last_year', 'industry_average']);

export const AnalyticsGranularitySchema = z.enum(['day', 'week', 'month', 'quarter', 'year']);

export const AnalyticsVisualizationTypeSchema = z.enum(['line', 'bar', 'pie', 'scatter', 'heatmap']);

export const AnalyticsExportFormatSchema = z.enum(['csv', 'json', 'excel', 'parquet']);

export const AnalyticsReportFormatSchema = z.enum(['pdf', 'html', 'excel']);

export const AnalyticsScheduleFrequencySchema = z.enum(['once', 'daily', 'weekly', 'monthly', 'quarterly']);

// =============================================================================
// Dashboard Analytics Schemas
// =============================================================================

export const DashboardAnalyticsQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  farmId: z.string().uuid().optional(),
  metrics: z.array(z.string()).optional(),
  comparison: AnalyticsComparisonSchema.optional(),
});

export const FarmToMarketQuerySchema = z.object({
  cropCycleId: z.string().uuid().optional(),
  commodityId: z.string().uuid().optional(),
  period: AnalyticsPeriodSchema.optional(),
});

export const ProfitabilityQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  farmId: z.string().uuid().optional(),
  commodityId: z.string().uuid().optional(),
  breakdown: z.boolean().optional(),
});

export const ROIAnalysisQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  investmentType: z.string().optional(),
  farmId: z.string().uuid().optional(),
});

// =============================================================================
// Production vs Market Performance Schemas
// =============================================================================

export const YieldVsMarketQuerySchema = z.object({
  commodityId: z.string().uuid().optional(),
  season: z.string().optional(),
  region: z.string().optional(),
});

export const QualityPremiumQuerySchema = z.object({
  commodityId: z.string().uuid().optional(),
  period: AnalyticsPeriodSchema.optional(),
  qualityGrade: z.string().optional(),
});

export const TimingAnalysisQuerySchema = z.object({
  commodityId: z.string().uuid().optional(),
  period: AnalyticsPeriodSchema.optional(),
  strategy: z.string().optional(),
});

export const DirectVsIntermediaryQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  commodityId: z.string().uuid().optional(),
  channel: z.string().optional(),
});

// =============================================================================
// Operational Efficiency Schemas
// =============================================================================

export const ActivityEfficiencyQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  activityType: z.string().optional(),
  farmId: z.string().uuid().optional(),
  comparison: AnalyticsComparisonSchema.optional(),
});

export const ResourceUtilizationQuerySchema = z.object({
  resourceType: z.string().optional(),
  period: AnalyticsPeriodSchema.optional(),
  farmId: z.string().uuid().optional(),
});

export const CostOptimizationQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  costCategory: z.string().optional(),
  farmId: z.string().uuid().optional(),
});

export const WorkflowAnalysisQuerySchema = z.object({
  workflowType: z.string().optional(),
  period: AnalyticsPeriodSchema.optional(),
  farmId: z.string().uuid().optional(),
});

// =============================================================================
// Market Intelligence Schemas
// =============================================================================

export const MarketPositioningQuerySchema = z.object({
  commodityId: z.string().uuid().optional(),
  region: z.string().optional(),
  competitor: z.string().optional(),
});

export const CustomerAnalysisQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  customerId: z.string().uuid().optional(),
  metric: z.string().optional(),
});

export const SupplierPerformanceQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  supplierId: z.string().uuid().optional(),
  metric: z.string().optional(),
});

export const PriceRealizationQuerySchema = z.object({
  commodityId: z.string().uuid().optional(),
  period: AnalyticsPeriodSchema.optional(),
  benchmark: z.string().optional(),
});

// =============================================================================
// Predictive Analytics Schemas
// =============================================================================

export const DemandPredictionQuerySchema = z.object({
  commodityId: z.string().uuid().optional(),
  horizon: z.string().optional(),
  scenario: z.string().optional(),
});

export const YieldPredictionQuerySchema = z.object({
  cropCycleId: z.string().uuid().optional(),
  model: z.string().optional(),
  factors: z.array(z.string()).optional(),
});

export const PriceForecastingQuerySchema = z.object({
  commodityId: z.string().uuid().optional(),
  horizon: z.string().optional(),
  region: z.string().optional(),
});

export const RiskAssessmentQuerySchema = z.object({
  riskType: z.string().optional(),
  period: AnalyticsPeriodSchema.optional(),
  scenario: z.string().optional(),
});

// =============================================================================
// Sustainability Schemas
// =============================================================================

export const SustainabilityMetricsQuerySchema = z.object({
  period: AnalyticsPeriodSchema.optional(),
  metric: z.string().optional(),
  farmId: z.string().uuid().optional(),
});

export const CertificationImpactQuerySchema = z.object({
  certificationType: z.string().optional(),
  period: AnalyticsPeriodSchema.optional(),
});

export const WasteReductionQuerySchema = z.object({
  wasteType: z.string().optional(),
  period: AnalyticsPeriodSchema.optional(),
  farmId: z.string().uuid().optional(),
});

// =============================================================================
// Comparative Analytics Schemas
// =============================================================================

export const PeerBenchmarkingQuerySchema = z.object({
  metric: z.string().optional(),
  farmSize: z.string().optional(),
  region: z.string().optional(),
  commodityId: z.string().uuid().optional(),
});

export const IndustryBenchmarksQuerySchema = z.object({
  industry: z.string().optional(),
  metric: z.string().optional(),
  region: z.string().optional(),
});

export const HistoricalComparisonQuerySchema = z.object({
  metric: z.string().optional(),
  baselinePeriod: z.string().optional(),
  currentPeriod: z.string().optional(),
});

// =============================================================================
// Custom Analytics Schemas
// =============================================================================

export const CustomQueryRequestSchema = z.object({
  query: z.object({
    metrics: z.array(z.string()),
    dimensions: z.array(z.string()),
    filters: z.record(z.any()),
    timeframe: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    granularity: AnalyticsGranularitySchema,
  }),
  visualization: z.object({
    type: AnalyticsVisualizationTypeSchema,
    options: z.record(z.any()).optional(),
  }),
});

export const DataExportRequestSchema = z.object({
  dataset: z.string(),
  filters: z.record(z.any()).optional(),
  format: AnalyticsExportFormatSchema,
  timeframe: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  includeMetadata: z.boolean().optional(),
});

export const InsightsQuerySchema = z.object({
  category: z.string().optional(),
  priority: z.string().optional(),
  farmId: z.string().uuid().optional(),
});

// =============================================================================
// Report Generation Schemas
// =============================================================================

export const ReportGenerationRequestSchema = z.object({
  templateId: z.string(),
  title: z.string(),
  parameters: z.object({
    period: z.string(),
    farmIds: z.array(z.string().uuid()),
    commodities: z.array(z.string().uuid()),
    includeComparisons: z.boolean().optional(),
    includePredictions: z.boolean().optional(),
  }),
  format: AnalyticsReportFormatSchema,
  recipients: z.array(z.string().email()),
  schedule: z.object({
    frequency: AnalyticsScheduleFrequencySchema,
    time: z.string(),
    timezone: z.string(),
  }).optional(),
});

export const ReportScheduleRequestSchema = z.object({
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
});

export const ReportsQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  dateRange: z.string().optional(),
});

// =============================================================================
// Response Schemas
// =============================================================================

export const AnalyticsDataPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
  label: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const AnalyticsMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  benchmark: z.number().optional(),
  target: z.number().optional(),
});

export const AnalyticsChartDataSchema = z.object({
  type: AnalyticsVisualizationTypeSchema,
  title: z.string(),
  data: z.array(AnalyticsDataPointSchema),
  xAxis: z.string(),
  yAxis: z.string(),
  series: z.array(z.string()).optional(),
});

export const AnalyticsInsightSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  actionable: z.boolean(),
  recommendations: z.array(z.string()).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const AnalyticsReportSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  format: AnalyticsReportFormatSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  downloadUrl: z.string().url().optional(),
  fileSize: z.number().optional(),
  recipients: z.array(z.string().email()),
});

export const AnalyticsExportSchema = z.object({
  id: z.string().uuid(),
  dataset: z.string(),
  format: AnalyticsExportFormatSchema,
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  downloadUrl: z.string().url().optional(),
  fileSize: z.number().optional(),
  recordCount: z.number().optional(),
});

// =============================================================================
// Collection Response Schemas
// =============================================================================

export const AnalyticsDashboardResponseSchema = z.object({
  data: z.object({
    type: z.literal('analytics_dashboard'),
    id: z.string().uuid(),
    attributes: z.object({
      period: AnalyticsPeriodSchema,
      farmId: z.string().uuid().optional(),
      metrics: z.array(AnalyticsMetricSchema),
      charts: z.array(AnalyticsChartDataSchema),
      insights: z.array(AnalyticsInsightSchema),
      summary: z.object({
        totalRevenue: z.number(),
        totalCosts: z.number(),
        netProfit: z.number(),
        profitMargin: z.number(),
        roi: z.number(),
      }),
    }),
  }),
});

export const AnalyticsReportsResponseSchema = z.object({
  data: z.array(z.object({
    type: z.literal('analytics_report'),
    id: z.string().uuid(),
    attributes: AnalyticsReportSchema,
  })),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});

export const AnalyticsExportsResponseSchema = z.object({
  data: z.array(z.object({
    type: z.literal('analytics_export'),
    id: z.string().uuid(),
    attributes: AnalyticsExportSchema,
  })),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});

export const AnalyticsInsightsResponseSchema = z.object({
  data: z.array(z.object({
    type: z.literal('analytics_insight'),
    id: z.string().uuid(),
    attributes: AnalyticsInsightSchema,
  })),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});

// =============================================================================
// Error Response Schemas
// =============================================================================

export const AnalyticsErrorResponseSchema = z.object({
  errors: z.array(z.object({
    id: z.string().uuid().optional(),
    status: z.string(),
    code: z.string(),
    title: z.string(),
    detail: z.string(),
    source: z.object({
      pointer: z.string().optional(),
      parameter: z.string().optional(),
    }).optional(),
  })),
});

// =============================================================================
// Type Exports
// =============================================================================

export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;
export type AnalyticsComparison = z.infer<typeof AnalyticsComparisonSchema>;
export type AnalyticsGranularity = z.infer<typeof AnalyticsGranularitySchema>;
export type AnalyticsVisualizationType = z.infer<typeof AnalyticsVisualizationTypeSchema>;
export type AnalyticsExportFormat = z.infer<typeof AnalyticsExportFormatSchema>;
export type AnalyticsReportFormat = z.infer<typeof AnalyticsReportFormatSchema>;
export type AnalyticsScheduleFrequency = z.infer<typeof AnalyticsScheduleFrequencySchema>;

export type DashboardAnalyticsQuery = z.infer<typeof DashboardAnalyticsQuerySchema>;
export type FarmToMarketQuery = z.infer<typeof FarmToMarketQuerySchema>;
export type ProfitabilityQuery = z.infer<typeof ProfitabilityQuerySchema>;
export type ROIAnalysisQuery = z.infer<typeof ROIAnalysisQuerySchema>;
export type YieldVsMarketQuery = z.infer<typeof YieldVsMarketQuerySchema>;
export type QualityPremiumQuery = z.infer<typeof QualityPremiumQuerySchema>;
export type TimingAnalysisQuery = z.infer<typeof TimingAnalysisQuerySchema>;
export type DirectVsIntermediaryQuery = z.infer<typeof DirectVsIntermediaryQuerySchema>;
export type ActivityEfficiencyQuery = z.infer<typeof ActivityEfficiencyQuerySchema>;
export type ResourceUtilizationQuery = z.infer<typeof ResourceUtilizationQuerySchema>;
export type CostOptimizationQuery = z.infer<typeof CostOptimizationQuerySchema>;
export type WorkflowAnalysisQuery = z.infer<typeof WorkflowAnalysisQuerySchema>;
export type MarketPositioningQuery = z.infer<typeof MarketPositioningQuerySchema>;
export type CustomerAnalysisQuery = z.infer<typeof CustomerAnalysisQuerySchema>;
export type SupplierPerformanceQuery = z.infer<typeof SupplierPerformanceQuerySchema>;
export type PriceRealizationQuery = z.infer<typeof PriceRealizationQuerySchema>;
export type DemandPredictionQuery = z.infer<typeof DemandPredictionQuerySchema>;
export type YieldPredictionQuery = z.infer<typeof YieldPredictionQuerySchema>;
export type PriceForecastingQuery = z.infer<typeof PriceForecastingQuerySchema>;
export type RiskAssessmentQuery = z.infer<typeof RiskAssessmentQuerySchema>;
export type SustainabilityMetricsQuery = z.infer<typeof SustainabilityMetricsQuerySchema>;
export type CertificationImpactQuery = z.infer<typeof CertificationImpactQuerySchema>;
export type WasteReductionQuery = z.infer<typeof WasteReductionQuerySchema>;
export type PeerBenchmarkingQuery = z.infer<typeof PeerBenchmarkingQuerySchema>;
export type IndustryBenchmarksQuery = z.infer<typeof IndustryBenchmarksQuerySchema>;
export type HistoricalComparisonQuery = z.infer<typeof HistoricalComparisonQuerySchema>;
export type CustomQueryRequest = z.infer<typeof CustomQueryRequestSchema>;
export type DataExportRequest = z.infer<typeof DataExportRequestSchema>;
export type InsightsQuery = z.infer<typeof InsightsQuerySchema>;
export type ReportGenerationRequest = z.infer<typeof ReportGenerationRequestSchema>;
export type ReportScheduleRequest = z.infer<typeof ReportScheduleRequestSchema>;
export type ReportsQuery = z.infer<typeof ReportsQuerySchema>;

export type AnalyticsDataPoint = z.infer<typeof AnalyticsDataPointSchema>;
export type AnalyticsMetric = z.infer<typeof AnalyticsMetricSchema>;
export type AnalyticsChartData = z.infer<typeof AnalyticsChartDataSchema>;
export type AnalyticsInsight = z.infer<typeof AnalyticsInsightSchema>;
export type AnalyticsReport = z.infer<typeof AnalyticsReportSchema>;
export type AnalyticsExport = z.infer<typeof AnalyticsExportSchema>;

export type AnalyticsDashboardResponse = z.infer<typeof AnalyticsDashboardResponseSchema>;
export type AnalyticsReportsResponse = z.infer<typeof AnalyticsReportsResponseSchema>;
export type AnalyticsExportsResponse = z.infer<typeof AnalyticsExportsResponseSchema>;
export type AnalyticsInsightsResponse = z.infer<typeof AnalyticsInsightsResponseSchema>;
export type AnalyticsErrorResponse = z.infer<typeof AnalyticsErrorResponseSchema>;
