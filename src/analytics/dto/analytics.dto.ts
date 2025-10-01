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
// Note: Internal DTOs are defined inline in services as needed
