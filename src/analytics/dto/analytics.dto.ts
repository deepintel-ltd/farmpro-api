// =============================================================================
// Simplified Analytics DTOs
// =============================================================================

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum AnalyticsTrend {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  EXCEL = 'excel',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

// =============================================================================
// Query DTOs
// =============================================================================

export class DashboardQuery {
  period?: AnalyticsPeriod;
  farmId?: string;
  metrics?: string[];
  comparison?: string;
}

export class ActivitiesQuery {
  period?: AnalyticsPeriod;
  farmId?: string;
  activityType?: string;
  comparison?: string;
}

export class FinancialQuery {
  period?: AnalyticsPeriod;
  farmId?: string;
  commodityId?: string;
  breakdown?: boolean;
}

export class FarmToMarketQuery {
  period?: AnalyticsPeriod;
  farmId?: string;
  cropCycleId?: string;
  commodityId?: string;
}

export class MarketPerformanceQuery {
  period?: AnalyticsPeriod;
  farmId?: string;
  commodityId?: string;
  region?: string;
}

export class ReportRequest {
  templateId: string;
  title: string;
  parameters: {
    period: string;
    farmIds?: string[];
    commodities?: string[];
    includeComparisons?: boolean;
    includePredictions?: boolean;
  };
  format: ReportFormat;
  recipients?: string[];
}

export class ExportRequest {
  dataset: string;
  format: ExportFormat;
  filters?: Record<string, any>;
  timeframe: {
    start: string;
    end: string;
  };
  includeMetadata?: boolean;
}

// =============================================================================
// Response DTOs
// =============================================================================

export class AnalyticsMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change?: number;
  changePercent?: number;
  benchmark?: number;
  target?: number;
  metadata?: Record<string, any>;
}

export class AnalyticsChart {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  data: Array<{
    timestamp: string;
    value: number;
    label?: string;
    metadata?: Record<string, any>;
  }>;
  xAxis: string;
  yAxis: string;
  series?: string[];
  options?: Record<string, any>;
}

export class AnalyticsInsight {
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
    metrics: AnalyticsMetric[];
    charts?: AnalyticsChart[];
  };
  createdAt: string;
  expiresAt?: string;
}

export class AnalyticsSummary {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
}

export class DashboardResponse {
  data: {
    type: 'analytics_dashboard';
    id: string;
    attributes: {
      period: AnalyticsPeriod;
      farmId?: string;
      metrics: AnalyticsMetric[];
      charts: AnalyticsChart[];
      insights: AnalyticsInsight[];
      summary: AnalyticsSummary;
    };
  };
}

export class ActivitiesResponse {
  data: {
    type: 'analytics_dashboard';
    id: string;
    attributes: {
      period: AnalyticsPeriod;
      farmId?: string;
      metrics: AnalyticsMetric[];
      charts: AnalyticsChart[];
      insights: AnalyticsInsight[];
      summary: AnalyticsSummary;
    };
  };
}

export class FinancialResponse {
  data: {
    type: 'analytics_dashboard';
    id: string;
    attributes: {
      period: AnalyticsPeriod;
      farmId?: string;
      metrics: AnalyticsMetric[];
      charts: AnalyticsChart[];
      insights: AnalyticsInsight[];
      summary: AnalyticsSummary;
    };
  };
}

export class FarmToMarketResponse {
  data: {
    type: 'analytics_dashboard';
    id: string;
    attributes: {
      period: AnalyticsPeriod;
      farmId?: string;
      metrics: AnalyticsMetric[];
      charts: AnalyticsChart[];
      insights: AnalyticsInsight[];
      summary: AnalyticsSummary;
    };
  };
}

export class MarketPerformanceResponse {
  data: {
    type: 'analytics_dashboard';
    id: string;
    attributes: {
      period: AnalyticsPeriod;
      farmId?: string;
      metrics: AnalyticsMetric[];
      charts: AnalyticsChart[];
      insights: AnalyticsInsight[];
      summary: AnalyticsSummary;
    };
  };
}

export class ReportResponse {
  data: {
    type: 'analytics_report';
    id: string;
    attributes: {
      id: string;
      title: string;
      type: string;
      status: 'pending' | 'completed' | 'failed' | 'generating';
      format: ReportFormat;
      parameters: Record<string, any>;
      generatedAt: string;
      createdAt: string;
      completedAt?: string;
      expiresAt?: string;
      downloadUrl?: string;
      fileSize?: number;
      recipients?: string[];
    };
  };
}

export class ExportResponse {
  data: {
    type: 'analytics_export';
    id: string;
    attributes: {
      id: string;
      dataset: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      format: ExportFormat;
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
    };
  };
}

export class ReportsListResponse {
  data: Array<{
    type: 'analytics_report';
    id: string;
    attributes: {
      id: string;
      title: string;
      type: string;
      status: 'pending' | 'completed' | 'failed' | 'generating';
      format: ReportFormat;
      parameters: Record<string, any>;
      generatedAt: string;
      createdAt: string;
      completedAt?: string;
      expiresAt?: string;
      downloadUrl?: string;
      fileSize?: number;
      recipients?: string[];
    };
  }>;
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export class ReportTemplatesResponse {
  data: Array<{
    type: 'report_template';
    id: string;
    attributes: {
      name: string;
      description: string;
      category: string;
      parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        options?: string[];
      }>;
      isCustom: boolean;
      createdAt: string;
    };
  }>;
}
