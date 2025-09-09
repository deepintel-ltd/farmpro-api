

// =============================================================================
// Enums
// =============================================================================

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum AnalyticsComparison {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  INDUSTRY_AVERAGE = 'industry_average',
}

export enum AnalyticsGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum AnalyticsVisualizationType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
}

export enum AnalyticsExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
  PARQUET = 'parquet',
}

export enum AnalyticsReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  EXCEL = 'excel',
}

export enum AnalyticsStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AnalyticsScheduleFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export enum AnalyticsPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AnalyticsTrend {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

export enum AnalyticsImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// =============================================================================
// Query DTOs
// =============================================================================

export class DashboardAnalyticsQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  metrics?: string[];
  comparison?: AnalyticsComparison;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
}

export class FarmToMarketQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  cropCycleId?: string;
  commodityId?: string;
}

export class ProfitabilityQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  breakdown?: boolean;
}

export class ROIAnalysisQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  investmentType?: string;
}

export class YieldVsMarketQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  benchmark?: string;
}

export class QualityPremiumQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  qualityGrade?: string;
}

export class TimingAnalysisQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  strategy?: string;
}

export class DirectVsIntermediaryQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  channel?: string;
}

export class ActivityEfficiencyQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  comparison?: AnalyticsComparison;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  activityType?: string;
}

export class ResourceUtilizationQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  resourceType?: string;
}

export class CostOptimizationQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  costCategory?: string;
}

export class WorkflowAnalysisQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  workflowType?: string;
}

export class MarketPositioningQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  region?: string;
}

export class CustomerAnalysisQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  customerId?: string;
  metric?: string;
}

export class SupplierPerformanceQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  metric?: string;
  supplierId?: string;
}

export class PriceRealizationQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  benchmark?: string;
  commodityId?: string;
}

export class DemandPredictionQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  horizon?: number;
}

export class YieldPredictionQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  season?: string;
}

export class PriceForecastingQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  horizon?: number;
}

export class RiskAssessmentQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  scenario?: string;
  riskType?: string;
}

export class SustainabilityMetricsQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  metric?: string;
}

export class CertificationImpactQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  certificationType?: string;
}

export class WasteReductionQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  wasteType?: string;
}

export class PeerBenchmarkingQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  region?: string;
  farmSize?: string;
}

export class IndustryBenchmarksQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  commodityId?: string;
  region?: string;
  metric?: string;
}

export class HistoricalComparisonQueryDto {
  sort?: string;
  period?: AnalyticsPeriod;
  farmId?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  comparisonPeriod?: string;
}

export class InsightsQueryDto {
  sort?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  category?: string;
  priority?: string;
}

export class ReportsQueryDto {
  sort?: string;
  include?: string;
  'page[number]'?: number;
  'page[size]'?: number;
  status?: string;
  format?: string;
  dateRange?: string;
}

// =============================================================================
// Request DTOs
// =============================================================================

export class CustomQueryRequestDto {
  metrics: string[];
  dimensions: string[];
  timeframe: {
    start: string;
    end: string;
  };
  granularity: AnalyticsGranularity;
  filters?: Record<string, any>;
  visualization?: {
    type: AnalyticsVisualizationType;
    options?: Record<string, any>;
  };
}

export class DataExportRequestDto {
  dataset: string;
  format: AnalyticsExportFormat;
  filters?: Record<string, any>;
  timeframe?: {
    start: string;
    end: string;
  };
  includeMetadata?: boolean;
}

export class ReportGenerationRequestDto {
  templateId: string;
  title?: string;
  format?: AnalyticsReportFormat;
  parameters?: {
    period?: string;
    farmIds?: string[];
    commodities?: string[];
    includeComparisons?: boolean;
    includePredictions?: boolean;
  };
  recipients?: string[];
  schedule?: {
    frequency: AnalyticsScheduleFrequency;
    time?: string;
    timezone?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
}

export class ReportScheduleRequestDto {
  reportConfig: Record<string, any>;
  recipients?: string[];
  schedule?: {
    frequency: AnalyticsScheduleFrequency;
    time?: string;
    timezone?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  isActive?: boolean;
}

// =============================================================================
// Response DTOs
// =============================================================================

export class AnalyticsDataPointDto {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export class AnalyticsMetricDto {
  name: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  changePercent?: number;
  benchmark?: number;
  target?: number;
  comparison?: {
    type: AnalyticsComparison;
    value: number;
    percentage: number;
  };
  metadata?: Record<string, any>;
}

export class AnalyticsChartDataDto {
  type: AnalyticsVisualizationType;
  title: string;
  data: AnalyticsDataPointDto[];
  xAxis: string;
  yAxis: string;
  series?: string[];
  options?: Record<string, any>;
}

export class AnalyticsInsightDto {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations?: string[];
  data: {
    metrics: AnalyticsMetricDto[];
    charts?: AnalyticsChartDataDto[];
  };
  createdAt: string;
  expiresAt?: string;
}

export class AnalyticsReportDto {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'completed' | 'failed' | 'generating';
  format: AnalyticsReportFormat;
  parameters: Record<string, any>;
  generatedAt: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
  fileSize?: number;
  recipients?: string[];
  schedule?: {
    frequency: AnalyticsScheduleFrequency;
    nextRun?: string;
  };
}

export class AnalyticsExportDto {
  id: string;
  dataset: string;
  status: AnalyticsStatus;
  format: AnalyticsExportFormat;
  filters: Record<string, any>;
  timeframe: {
    start: string;
    end: string;
  };
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  errorMessage?: string;
}

export class AnalyticsDashboardResponseDto {
  data: {
    type: 'analytics_dashboard';
    id: string;
    attributes: {
      period: AnalyticsPeriod;
      farmId?: string;
      metrics: AnalyticsMetricDto[];
      charts: AnalyticsChartDataDto[];
      insights: AnalyticsInsightDto[];
      summary: {
        totalRevenue: number;
        totalCosts: number;
        netProfit: number;
        profitMargin: number;
        roi: number;
      };
    };
  };
}

export class AnalyticsReportsResponseDto {
  data: {
    type: 'analytics_report';
    id: string;
    attributes: AnalyticsReportDto;
  }[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export class AnalyticsExportsResponseDto {
  data: {
    type: 'analytics_export';
    id: string;
    attributes: AnalyticsExportDto;
  }[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export class AnalyticsInsightsResponseDto {
  data: {
    type: 'analytics_insight';
    id: string;
    attributes: AnalyticsInsightDto;
  }[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}
