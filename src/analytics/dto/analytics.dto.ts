// =============================================================================
// Analytics DTOs - Essential DTOs Only (Types are in contracts)
// =============================================================================

// Re-export types from contracts to avoid duplication
export type {
  BaseAnalyticsQuery,
  FinancialQuery,
  ActivityQuery,
  MarketQuery,
  FarmToMarketQuery,
  ExportRequest,
  ReportRequest,
  AnalyticsResponse,
  AnalyticsMetric,
  AnalyticsChart,
  AnalyticsInsight,
  AnalyticsSummary,
} from '@contracts/analytics.contract';

// =============================================================================
// Service Layer DTOs - Internal Use Only
// =============================================================================

export interface AnalyticsServiceConfig {
  enableCaching: boolean;
  cacheTTL: number;
  enableInsights: boolean;
  enablePredictions: boolean;
}

export interface AnalyticsQueryContext {
  userId: string;
  organizationId: string;
  farmId?: string;
  permissions: string[];
}

export interface AnalyticsCacheConfig {
  key: string;
  ttl: number;
  tags?: string[];
}
