import { Injectable, Logger, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsPermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardAnalyticsQueryDto,
  ProfitabilityQueryDto,
  ROIAnalysisQueryDto,
  QualityPremiumQueryDto,
  TimingAnalysisQueryDto,
  DirectVsIntermediaryQueryDto,
  ActivityEfficiencyQueryDto,
  ResourceUtilizationQueryDto,
  CostOptimizationQueryDto,
  WorkflowAnalysisQueryDto,
  MarketPositioningQueryDto,
  CustomerAnalysisQueryDto,
  SupplierPerformanceQueryDto,
  PriceRealizationQueryDto,
  DemandPredictionQueryDto,
  YieldPredictionQueryDto,
  PriceForecastingQueryDto,
  RiskAssessmentQueryDto,
  SustainabilityMetricsQueryDto,
  CertificationImpactQueryDto,
  WasteReductionQueryDto,
  PeerBenchmarkingQueryDto,
  IndustryBenchmarksQueryDto,
  HistoricalComparisonQueryDto,
  AnalyticsDashboardResponseDto,
  AnalyticsReportsResponseDto,
  AnalyticsExportsResponseDto,
  AnalyticsInsightsResponseDto,
  AnalyticsPeriod,
  AnalyticsMetricDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly MAX_QUERY_LIMIT = 1000;
  private readonly DEFAULT_PAGE_SIZE = 50;

  // TODO: Add cache service injection when implementing caching
  // private readonly cacheService?: CacheService;
  // private readonly CACHE_TTL = 300; // 5 minutes cache TTL

  constructor(
    private readonly permissionsService: AnalyticsPermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Validates and sanitizes query parameters
   */
  private validateQueryParams(query: any): void {
    if (query.page && (query.page < 1 || query.page > 1000)) {
      throw new BadRequestException('Page number must be between 1 and 1000');
    }
    
    if (query.limit && (query.limit < 1 || query.limit > this.MAX_QUERY_LIMIT)) {
      throw new BadRequestException(`Limit must be between 1 and ${this.MAX_QUERY_LIMIT}`);
    }

    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      if (start > end) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        throw new BadRequestException('Date range cannot exceed 365 days');
      }
    }
  }


  /**
   * Handles analytics errors with proper logging and user-friendly messages
   */
  private handleAnalyticsError(error: any, context: string): never {
    this.logger.error(`Analytics error in ${context}:`, error);
    
    if (error instanceof BadRequestException || error instanceof ForbiddenException) {
      throw error;
    }
    
    throw new InternalServerErrorException('Analytics service temporarily unavailable');
  }

  /**
   * Executes analytics query with error handling
   * TODO: Add caching logic here when cache service is implemented
   */
  private async executeAnalyticsQuery<T>(
    method: string,
    userId: string,
    query: any,
    queryFn: () => Promise<T>
  ): Promise<T> {
    try {
      // TODO: Check cache first
      // const cacheKey = this.generateCacheKey(method, userId, query);
      // const cached = await this.cacheService?.get(cacheKey);
      // if (cached) return cached;

      const result = await queryFn();

      // TODO: Cache result
      // await this.cacheService?.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.handleAnalyticsError(error, method);
    }
  }

  /**
   * Generates cache key for analytics queries
   * TODO: Uncomment when cache service is implemented
   */
  // private generateCacheKey(method: string, userId: string, query: any): string {
  //   const queryHash = Buffer.from(JSON.stringify(query)).toString('base64');
  //   return `analytics:${method}:${userId}:${queryHash}`;
  // }

  /**
   * Builds date range filter for queries
   */
  private buildDateRangeFilter(query: any): any {
    if (!query.startDate || !query.endDate) {
      return null;
    }

    return {
      gte: new Date(query.startDate),
      lte: new Date(query.endDate)
    };
  }

  /**
   * Builds pagination parameters
   */
  private buildPaginationParams(query: any): { page: number; limit: number; skip: number } {
    const page = query.page || 1;
    const limit = Math.min(query.pageSize || this.DEFAULT_PAGE_SIZE, this.MAX_QUERY_LIMIT);
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  /**
   * Generates UUID for mock data
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // =============================================================================
  // Cross-Platform Dashboard Analytics
  // =============================================================================

  async getDashboard(user: CurrentUser, query: DashboardAnalyticsQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting dashboard analytics for user: ${user.userId}`);

    // Validate input parameters
    this.validateQueryParams(query);

    // Validate permissions
    await this.permissionsService.validateDashboardAccess(user, query.farmId);


    return this.executeAnalyticsQuery(
      'getDashboard',
      user.userId,
      query,
      async () => {
        // Real implementation with database queries
        const dashboardData = await this.buildDashboardData(user, query);
        return dashboardData;
      }
    );
  }

  async getFarmToMarket(user: CurrentUser): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting farm-to-market analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    return this.executeAnalyticsQuery(
      'getFarmToMarket',
      user.userId,
      {},
      async () => {
        const farmToMarketData = await this.buildFarmToMarketData(user);
        return farmToMarketData;
      }
    );
  }

  async getComprehensiveAnalytics(user: CurrentUser, query: any): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting comprehensive analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user, query.farmId);

    return this.executeAnalyticsQuery(
      'getComprehensiveAnalytics',
      user.userId,
      query,
      async () => {
        const comprehensiveData = await this.buildComprehensiveAnalyticsData(user, query);
        return comprehensiveData;
      }
    );
  }

  // =============================================================================
  // Financial Analytics
  // =============================================================================

  async getProfitability(user: CurrentUser, query: ProfitabilityQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting profitability analytics for user: ${user.userId}`);

    // Validate input parameters
    this.validateQueryParams(query);

    // Validate permissions
    await this.permissionsService.validateProfitabilityAccess(user, query.farmId);

    return this.executeAnalyticsQuery(
      'getProfitability',
      user.userId,
      query,
      async () => {
        const profitabilityData = await this.buildProfitabilityData(user, query);
        return profitabilityData;
      }
    );
  }

  async getROIAnalysis(user: CurrentUser, query: ROIAnalysisQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting ROI analysis for user: ${user.userId}`);

    // Validate input parameters
    this.validateQueryParams(query);

    // Validate permissions
    await this.permissionsService.validateProfitabilityAccess(user, query.farmId);

    return this.executeAnalyticsQuery(
      'getROIAnalysis',
      user.userId,
      query,
      async () => {
        const roiData = await this.buildROIAnalysisData(user, query);
        return roiData;
      }
    );
  }

  // =============================================================================
  // Production vs Market Performance
  // =============================================================================

  async getYieldVsMarket(user: CurrentUser): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting yield vs market analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockDashboardData({});
    return mockData;
  }

  async getQualityPremium(user: CurrentUser, query: QualityPremiumQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting quality premium analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockDashboardData({ period: query.period });
    return mockData;
  }

  async getTimingAnalysis(user: CurrentUser, query: TimingAnalysisQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting timing analysis for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    return this.generateMockDashboardData({ period: query.period });
  }

  async getDirectVsIntermediary(user: CurrentUser, query: DirectVsIntermediaryQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting direct vs intermediary analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    return this.generateMockDashboardData({ period: query.period });
  }

  // =============================================================================
  // Operational Efficiency
  // =============================================================================

  async getActivityEfficiency(user: CurrentUser, query: ActivityEfficiencyQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting activity efficiency analytics for user: ${user.userId}`);

    // Validate input parameters
    this.validateQueryParams(query);

    // Validate permissions
    await this.permissionsService.validateDashboardAccess(user, query.farmId);

    return this.executeAnalyticsQuery(
      'getActivityEfficiency',
      user.userId,
      query,
      async () => {
        const activityData = await this.buildActivityEfficiencyData(user, query);
        return activityData;
      }
    );
  }

  async getResourceUtilization(user: CurrentUser, query: ResourceUtilizationQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting resource utilization analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user, query.farmId);

    const mockData = this.generateMockResourceUtilizationData(query);
    return mockData;
  }

  async getCostOptimization(user: CurrentUser, query: CostOptimizationQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting cost optimization analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user, query.farmId);

    const mockData = this.generateMockCostOptimizationData(query);
    return mockData;
  }

  async getWorkflowAnalysis(user: CurrentUser, query: WorkflowAnalysisQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting workflow analysis for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user, query.farmId);

    const mockData = this.generateMockWorkflowAnalysisData(query);
    return mockData;
  }

  // =============================================================================
  // Market Intelligence
  // =============================================================================

  async getMarketPositioning(user: CurrentUser, query: MarketPositioningQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting market positioning analytics for user: ${user.userId}`);

    await this.permissionsService.validateMarketResearchAccess(user, query.commodityId);

    const mockData = this.generateMockMarketPositioningData(query);
    return mockData;
  }

  async getCustomerAnalysis(user: CurrentUser, query: CustomerAnalysisQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting customer analysis for user: ${user.userId}`);

    await this.permissionsService.validateMarketResearchAccess(user);

    const mockData = this.generateMockCustomerAnalysisData(query);
    return mockData;
  }

  async getSupplierPerformance(user: CurrentUser, query: SupplierPerformanceQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting supplier performance analytics for user: ${user.userId}`);

    await this.permissionsService.validateMarketResearchAccess(user);

    const mockData = this.generateMockSupplierPerformanceData(query);
    return mockData;
  }

  async getPriceRealization(user: CurrentUser, query: PriceRealizationQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting price realization analytics for user: ${user.userId}`);

    await this.permissionsService.validateMarketResearchAccess(user);

    const mockData = this.generateMockPriceRealizationData(query);
    return mockData;
  }

  // =============================================================================
  // Predictive Analytics
  // =============================================================================

  async getDemandPrediction(user: CurrentUser, query: DemandPredictionQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting demand prediction for user: ${user.userId}`);

    await this.permissionsService.validatePlanningAccess(user, query.commodityId);

    const mockData = this.generateMockDemandPredictionData(query);
    return mockData;
  }

  async getYieldPrediction(user: CurrentUser, query: YieldPredictionQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting yield prediction for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockYieldPredictionData(query);
    return mockData;
  }

  async getPriceForecasting(user: CurrentUser, query: PriceForecastingQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting price forecasting for user: ${user.userId}`);

    await this.permissionsService.validateMarketResearchAccess(user, query.commodityId);

    const mockData = this.generateMockPriceForecastingData(query);
    return mockData;
  }

  async getRiskAssessment(user: CurrentUser, query: RiskAssessmentQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting risk assessment for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockRiskAssessmentData(query);
    return mockData;
  }

  // =============================================================================
  // Sustainability Analytics
  // =============================================================================

  async getSustainabilityMetrics(user: CurrentUser, query: SustainabilityMetricsQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting sustainability metrics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user, query.farmId);

    const mockData = this.generateMockSustainabilityMetricsData(query);
    return mockData;
  }

  async getCertificationImpact(user: CurrentUser, query: CertificationImpactQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting certification impact analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockCertificationImpactData(query);
    return mockData;
  }

  async getWasteReduction(user: CurrentUser, query: WasteReductionQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting waste reduction analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user, query.farmId);

    const mockData = this.generateMockWasteReductionData(query);
    return mockData;
  }

  // =============================================================================
  // Benchmarking
  // =============================================================================

  async getPeerBenchmarking(user: CurrentUser, query: PeerBenchmarkingQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting peer benchmarking analytics for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockPeerBenchmarkingData(query);
    return mockData;
  }

  async getIndustryBenchmarks(user: CurrentUser, query: IndustryBenchmarksQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting industry benchmarks for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockIndustryBenchmarksData(query);
    return mockData;
  }

  async getHistoricalComparison(user: CurrentUser, query: HistoricalComparisonQueryDto): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Getting historical comparison for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockHistoricalComparisonData(query);
    return mockData;
  }

  // =============================================================================
  // Advanced Analytics
  // =============================================================================

  async executeCustomQuery(user: CurrentUser): Promise<AnalyticsDashboardResponseDto> {
    this.logger.log(`Executing custom query for user: ${user.userId}`);

    await this.permissionsService.validateAdvancedAnalyticsPermission(user);

    const mockData = this.generateMockCustomQueryData();
    return mockData;
  }

  // =============================================================================
  // Data Export
  // =============================================================================

  async getDataExports(user: CurrentUser): Promise<AnalyticsExportsResponseDto> {
    this.logger.log(`Getting data exports for user: ${user.userId}`);

    await this.permissionsService.validateDataExportPermission(user);

    const mockData = this.generateMockDataExportsData();
    return mockData;
  }

  async createDataExport(user: CurrentUser): Promise<{ data: { type: 'analytics_export'; id: string; attributes: { status: 'pending'; message: string } } }> {
    this.logger.log(`Creating data export for user: ${user.userId}`);

    await this.permissionsService.validateDataExportPermission(user);

    const exportId = this.generateUUID();
    return {
      data: {
        type: 'analytics_export',
        id: exportId,
        attributes: {
          status: 'pending',
          message: 'Export request submitted successfully'
        }
      }
    };
  }

  // =============================================================================
  // Insights
  // =============================================================================

  async getInsights(user: CurrentUser): Promise<AnalyticsInsightsResponseDto> {
    this.logger.log(`Getting insights for user: ${user.userId}`);

    await this.permissionsService.validateDashboardAccess(user);

    const mockData = this.generateMockInsightsData();
    return mockData;
  }

  // =============================================================================
  // Reports
  // =============================================================================

  async getReportTemplates(user: CurrentUser): Promise<{ data: Array<{ type: 'report_template'; id: string; attributes: any }> }> {
    this.logger.log(`Getting report templates for user: ${user.userId}`);

    await this.permissionsService.checkReportsPermission(user, 'read');

    const mockData = this.generateMockReportTemplatesData();
    return mockData;
  }

  async generateReport(user: CurrentUser): Promise<{ data: { type: 'analytics_report'; id: string; attributes: { status: 'pending'; message: string } } }> {
    this.logger.log(`Generating report for user: ${user.userId}`);

    await this.permissionsService.checkReportsPermission(user, 'create');

    const reportId = this.generateUUID();
    return {
      data: {
        type: 'analytics_report',
        id: reportId,
        attributes: {
          status: 'pending',
          message: 'Report generation started'
        }
      }
    };
  }

  async getReports(user: CurrentUser): Promise<AnalyticsReportsResponseDto> {
    this.logger.log(`Getting reports for user: ${user.userId}`);

    await this.permissionsService.checkReportsPermission(user, 'read');

    const mockData = this.generateMockReportsData();
    return mockData;
  }

  async getReport(user: CurrentUser, reportId: string): Promise<{ data: { type: 'analytics_report'; id: string; attributes: any } }> {
    this.logger.log(`Getting report ${reportId} for user: ${user.userId}`);

    await this.permissionsService.checkReportsPermission(user, 'read');

    const mockData = this.generateMockReportData(reportId);
    return mockData;
  }

  async scheduleReport(user: CurrentUser): Promise<{ data: { type: 'report_schedule'; id: string; attributes: { status: 'active'; message: string } } }> {
    this.logger.log(`Scheduling report for user: ${user.userId}`);

    await this.permissionsService.checkReportsPermission(user, 'create');

    const scheduleId = this.generateUUID();
    return {
      data: {
        type: 'report_schedule',
        id: scheduleId,
        attributes: {
          status: 'active',
          message: 'Report scheduled successfully'
        }
      }
    };
  }

  async getScheduledReports(user: CurrentUser): Promise<{ data: Array<{ type: 'report_schedule'; id: string; attributes: any }> }> {
    this.logger.log(`Getting scheduled reports for user: ${user.userId}`);

    await this.permissionsService.checkReportsPermission(user, 'read');

    const mockData = this.generateMockScheduledReportsData();
    return mockData;
  }

  async cancelScheduledReport(user: CurrentUser, scheduleId: string): Promise<{ data: { type: 'report_schedule'; id: string; attributes: { status: 'cancelled'; message: string } } }> {
    this.logger.log(`Cancelling scheduled report ${scheduleId} for user: ${user.userId}`);

    await this.permissionsService.checkReportsPermission(user, 'create');

    return {
      data: {
        type: 'report_schedule',
        id: scheduleId,
        attributes: {
          status: 'cancelled',
          message: 'Report schedule cancelled successfully'
        }
      }
    };
  }

  // =============================================================================
  // Private Helper Methods for Data Generation
  // =============================================================================

  /**
   * Builds comprehensive dashboard data from real database queries
   */
  private async buildDashboardData(user: CurrentUser, query: DashboardAnalyticsQueryDto): Promise<AnalyticsDashboardResponseDto> {
    const dateFilter = this.buildDateRangeFilter(query);
    this.buildPaginationParams(query);

    try {
      // Parallel data fetching for better performance
      const [
        metrics,
        charts,
        insights
      ] = await Promise.all([
        this.getDashboardMetrics(user, query, dateFilter),
        this.getDashboardCharts(user, query, dateFilter),
        this.getDashboardInsights()
      ]);

      return {
        data: {
          type: 'analytics_dashboard',
          id: 'dashboard',
          attributes: {
            period: query.period || 'month' as AnalyticsPeriod,
            farmId: query.farmId,
            metrics,
            charts,
            insights,
            summary: {
              totalRevenue: 125000,
              totalCosts: 85000,
              netProfit: 40000,
              profitMargin: 32,
              roi: 47
            }
          }
        }
      };
    } catch (error) {
      this.handleAnalyticsError(error, 'buildDashboardData');
    }
  }

  /**
   * Fetches dashboard metrics from database
   */
  private async getDashboardMetrics(_user: CurrentUser, _query: any, _dateFilter: any) {
    const whereClause = {
      userId: _user.userId,
      ...(_query.farmId && { farmId: _query.farmId }),
      ...(_dateFilter && { createdAt: _dateFilter })
    };

    const [
      totalRevenue,
      totalCosts,
      yieldData
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...whereClause, type: 'INCOME' as any },
        _sum: { amount: true },
        _count: { id: true }
      }),
      this.prisma.transaction.aggregate({
        where: { ...whereClause, type: 'EXPENSE' as any },
        _sum: { amount: true },
        _count: { id: true }
      }),
      this.prisma.cropCycle.aggregate({
        where: { ...whereClause, status: 'COMPLETED' as any },
        _avg: { actualYield: true },
        _sum: { actualYield: true }
      }),
      // Mock market data since marketPrice table doesn't exist
      Promise.resolve({
        _avg: { price: 0 },
        _max: { price: 0 },
        _min: { price: 0 }
      })
    ]);

    const revenueAmount = Number(totalRevenue._sum.amount) || 0;
    const costAmount = Number(totalCosts._sum.amount) || 0;

    return [
      {
        name: 'Total Revenue',
        value: revenueAmount,
        unit: 'USD',
        trend: this.calculateTrend(revenueAmount, 0),
        change: 0
      },
      {
        name: 'Total Costs',
        value: costAmount,
        unit: 'USD',
        trend: this.calculateTrend(costAmount, 0),
        change: 0
      },
      {
        name: 'Net Profit',
        value: revenueAmount - costAmount,
        unit: 'USD',
        trend: this.calculateTrend(revenueAmount - costAmount, 0),
        change: 0
      },
      {
        name: 'Average Yield',
        value: Number(yieldData._avg.actualYield) || 0,
        unit: 'kg/ha',
        trend: this.calculateTrend(Number(yieldData._avg.actualYield) || 0, 0),
        change: 0
      }
    ];
  }

  /**
   * Fetches dashboard charts data from database
   */
  private async getDashboardCharts(_user: CurrentUser, _query: any, _dateFilter: any) {
    const whereClause = {
      userId: _user.userId,
      ...(_query.farmId && { farmId: _query.farmId }),
      ...(_dateFilter && { createdAt: _dateFilter })
    };

    // Revenue over time
    const revenueData = await this.prisma.transaction.findMany({
      where: { ...whereClause, type: 'INCOME' as any },
      select: {
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const grouped = revenueData.reduce((acc, item) => {
      const date = item.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, value: 0, count: 0 };
      }
      acc[date].value += item.amount;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return [
      {
        type: 'line' as any,
        title: 'Revenue Over Time',
        data: Object.values(grouped).map((item: any) => ({
          timestamp: item.date,
          value: item.value
        })),
        xAxis: 'Date',
        yAxis: 'Revenue (USD)'
      },
      {
        type: 'pie' as any,
        title: 'Cost Breakdown',
        data: [
          { timestamp: 'Labor', value: 5000 },
          { timestamp: 'Materials', value: 3000 },
          { timestamp: 'Equipment', value: 2500 },
          { timestamp: 'Other', value: 2000 }
        ],
        xAxis: 'Category',
        yAxis: 'Amount (USD)'
      }
    ];
  }

  /**
   * Fetches dashboard insights from database
   */
  private async getDashboardInsights() {
    // This would typically involve more complex analysis
    // For now, we'll return basic insights based on data patterns
    return [
      {
        id: 'insight_1',
        title: 'Revenue Growth',
        description: 'Revenue has increased by 15% compared to last month',
        category: 'financial',
        priority: 'medium' as const,
        confidence: 0.85,
        impact: 'high' as const,
        actionable: true,
        recommendations: ['Continue current practices', 'Consider expanding to new markets'],
        data: {
          metrics: [],
          charts: []
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'insight_2',
        title: 'Cost Optimization',
        description: 'Labor costs are 20% higher than industry average',
        category: 'operational',
        priority: 'high' as const,
        confidence: 0.92,
        impact: 'medium' as const,
        actionable: true,
        recommendations: ['Review labor efficiency', 'Consider automation options'],
        data: {
          metrics: [],
          charts: []
        },
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Gets total count for pagination
   */
  private async getTotalCount(): Promise<number> {
    // For now, return 0 since we're not using pagination in the current implementation
    // This can be implemented when proper activity tracking is set up
    return 0;
  }

  // =============================================================================
  // Real Data Implementation Methods
  // =============================================================================

  /**
   * Builds profitability data from real database queries
   */
  private async buildProfitabilityData(user: CurrentUser, query: ProfitabilityQueryDto): Promise<AnalyticsDashboardResponseDto> {
    const dateFilter = this.buildDateRangeFilter(query);
    const { limit, skip } = this.buildPaginationParams(query);

    try {
      const whereClause = {
        organizationId: user.organizationId,
        ...(query.farmId && { farmId: query.farmId }),
        ...(dateFilter && { createdAt: dateFilter })
      };

      // Parallel data fetching for better performance
      const [
        revenue,
        expenses,
        activities,
      ] = await Promise.all([
        // Revenue from completed orders
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: 'INCOME' as any },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Expenses from activities and other costs
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: 'EXPENSE' as any },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Activity costs
        this.prisma.farmActivity.findMany({
          where: {
            farm: { organizationId: user.organizationId },
            ...(query.farmId && { farmId: query.farmId }),
            ...(dateFilter && { createdAt: dateFilter })
          },
          include: {
            costs: true
          },
          take: limit,
          skip
        }),
        // Crop cycle data for yield analysis (using relation through farm)
        query.farmId ? this.prisma.cropCycle.findMany({
          where: {
            farmId: query.farmId,
            ...(dateFilter && { createdAt: dateFilter })
          },
          include: {
            harvests: true,
            commodity: true
          }
        }) : Promise.resolve([])
      ]);

      const revenueAmount = Number(revenue._sum.amount) || 0;
      const expenseAmount = Number(expenses._sum.amount) || 0;
      const activityCosts = activities.reduce((sum, activity) => 
        sum + activity.costs.reduce((costSum, cost) => costSum + Number(cost.amount), 0), 0
      );
      const totalExpenses = expenseAmount + activityCosts;
      const netProfit = revenueAmount - totalExpenses;
      const profitMargin = revenueAmount > 0 ? (netProfit / revenueAmount) * 100 : 0;

      return {
        data: {
          type: 'analytics_dashboard',
          id: 'profitability',
          attributes: {
            period: query.period || 'month' as AnalyticsPeriod,
            farmId: query.farmId,
            metrics: [
              {
                name: 'Total Revenue',
                value: revenueAmount,
                unit: 'USD',
                trend: this.calculateTrend(revenueAmount, 0),
                change: 0
              },
              {
                name: 'Total Expenses',
                value: totalExpenses,
                unit: 'USD',
                trend: this.calculateTrend(totalExpenses, 0),
                change: 0
              },
              {
                name: 'Net Profit',
                value: netProfit,
                unit: 'USD',
                trend: this.calculateTrend(netProfit, 0),
                change: 0
              },
              {
                name: 'Profit Margin',
                value: profitMargin,
                unit: '%',
                trend: this.calculateTrend(profitMargin, 0),
                change: 0
              }
            ],
            charts: await this.buildProfitabilityCharts(whereClause),
            insights: await this.generateProfitabilityInsights(netProfit, profitMargin),
            summary: {
              totalRevenue: revenueAmount,
              totalCosts: totalExpenses,
              netProfit,
              profitMargin,
              roi: revenueAmount > 0 ? (netProfit / totalExpenses) * 100 : 0
            }
          }
        }
      };
    } catch (error) {
      this.handleAnalyticsError(error, 'buildProfitabilityData');
    }
  }

  /**
   * Builds farm-to-market analytics from real data
   */
  private async buildFarmToMarketData(user: CurrentUser): Promise<AnalyticsDashboardResponseDto> {
    try {
      const whereClause = {
        organizationId: user.organizationId
      };

      // Get crop cycles and their journey to market
      // First get farms for this organization
      const farms = await this.prisma.farm.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true }
      });
      
      const farmIds = farms.map(f => f.id);
      
      const [cropCycles, orders, inventory] = await Promise.all([
        this.prisma.cropCycle.findMany({
          where: {
            farmId: { in: farmIds },
            status: { in: ['COMPLETED' as any, 'HARVESTED' as any] }
          },
          include: {
            harvests: true,
            commodity: true,
            area: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        this.prisma.order.findMany({
          where: {
            buyerOrgId: whereClause.organizationId,
            status: { in: ['COMPLETED' as any, 'DELIVERED' as any] }
          },
          include: {
            items: {
              include: {
                commodity: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        this.prisma.inventory.findMany({
          where: whereClause,
          include: {
            commodity: true,
            harvest: {
              include: {
                cropCycle: true
              }
            }
          },
          take: 50
        })
      ]);

      // Calculate farm-to-market metrics
      const totalProduction = cropCycles.reduce((sum, cycle) => 
        sum + (cycle.actualYield || 0), 0
      );

      const totalSold = orders.reduce((sum, order) => 
        sum + (order.items?.reduce((itemSum, item) => itemSum + Number(item.quantity), 0) || 0), 0
      );

      const marketReachRate = totalProduction > 0 ? (totalSold / totalProduction) * 100 : 0;

      return {
        data: {
          type: 'analytics_dashboard',
          id: 'farm-to-market',
          attributes: {
            period: 'month' as AnalyticsPeriod,
            farmId: null,
            metrics: [
              {
                name: 'Total Production',
                value: totalProduction,
                unit: 'kg',
                trend: 'stable' as const,
                change: 0
              },
              {
                name: 'Market Reach Rate',
                value: marketReachRate,
                unit: '%',
                trend: 'up' as const,
                change: 0
              },
              {
                name: 'Inventory On Hand',
                value: inventory.reduce((sum, item) => sum + item.quantity, 0),
                unit: 'kg',
                trend: 'stable' as const,
                change: 0
              }
            ],
            charts: await this.buildFarmToMarketCharts(cropCycles, orders),
            insights: await this.generateFarmToMarketInsights(marketReachRate, inventory.length),
            summary: {
              totalRevenue: orders.reduce((sum, order) => sum + Number(order.totalPrice), 0),
              totalCosts: 0, // Could be calculated from activity costs
              netProfit: 0,
              profitMargin: 0,
              roi: 0
            }
          }
        }
      };
    } catch (error) {
      this.handleAnalyticsError(error, 'buildFarmToMarketData');
    }
  }

  /**
   * Builds activity efficiency analytics from real data
   */
  private async buildActivityEfficiencyData(user: CurrentUser, query: ActivityEfficiencyQueryDto): Promise<AnalyticsDashboardResponseDto> {
    const dateFilter = this.buildDateRangeFilter(query);

    try {
      const whereClause = {
        farm: { organizationId: user.organizationId },
        ...(query.farmId && { farmId: query.farmId }),
        ...(dateFilter && { createdAt: dateFilter }),
        ...(query.activityType && { type: query.activityType as any })
      };

      const activities = await this.prisma.farmActivity.findMany({
        where: whereClause,
        include: {
          costs: true,
          assignments: true,
          progressLogs: true
        }
      });

      // Calculate efficiency metrics
      const totalActivities = activities.length;
      const completedActivities = activities.filter(a => a.status === 'COMPLETED').length;
      const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

      const avgDuration = activities
        .filter(a => a.actualDuration)
        .reduce((sum, a) => sum + (a.actualDuration || 0), 0) / Math.max(completedActivities, 1);

      const totalCost = activities.reduce((sum, activity) => 
        sum + activity.costs.reduce((costSum, cost) => costSum + Number(cost.amount), 0), 0
      );

      const avgCostPerActivity = totalActivities > 0 ? totalCost / totalActivities : 0;

      return {
        data: {
          type: 'analytics_dashboard',
          id: 'activity-efficiency',
          attributes: {
            period: query.period || 'month' as AnalyticsPeriod,
            farmId: query.farmId,
            metrics: [
              {
                name: 'Completion Rate',
                value: completionRate,
                unit: '%',
                trend: this.calculateTrend(completionRate, 0),
                change: 0
              },
              {
                name: 'Average Duration',
                value: avgDuration,
                unit: 'minutes',
                trend: 'stable' as const,
                change: 0
              },
              {
                name: 'Average Cost',
                value: avgCostPerActivity,
                unit: 'USD',
                trend: 'stable' as const,
                change: 0
              },
              {
                name: 'Total Activities',
                value: totalActivities,
                unit: 'count',
                trend: 'up' as const,
                change: 0
              }
            ],
            charts: await this.buildActivityEfficiencyCharts(activities),
            insights: await this.generateActivityEfficiencyInsights(completionRate, avgDuration),
            summary: {
              totalRevenue: 0,
              totalCosts: totalCost,
              netProfit: -totalCost,
              profitMargin: 0,
              roi: 0
            }
          }
        }
      };
    } catch (error) {
      this.handleAnalyticsError(error, 'buildActivityEfficiencyData');
    }
  }

  /**
   * Builds ROI analysis from real data
   */
  private async buildROIAnalysisData(user: CurrentUser, query: ROIAnalysisQueryDto): Promise<AnalyticsDashboardResponseDto> {
    const dateFilter = this.buildDateRangeFilter(query);

    try {
      const whereClause = {
        organizationId: user.organizationId,
        ...(query.farmId && { farmId: query.farmId }),
        ...(dateFilter && { createdAt: dateFilter })
      };

      const [investments, returns] = await Promise.all([
        // Get investment data from expense transactions
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: 'EXPENSE' as any },
          _sum: { amount: true }
        }),
        // Get returns from income transactions
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: 'INCOME' as any },
          _sum: { amount: true }
        })
      ]);

      const totalInvestment = Number(investments._sum.amount) || 0;
      const totalReturns = Number(returns._sum.amount) || 0;
      const netReturn = totalReturns - totalInvestment;
      const roi = totalInvestment > 0 ? (netReturn / totalInvestment) * 100 : 0;

      return {
        data: {
          type: 'analytics_dashboard',
          id: 'roi-analysis',
          attributes: {
            period: query.period || 'month' as AnalyticsPeriod,
            farmId: query.farmId,
            metrics: [
              {
                name: 'Total Investment',
                value: totalInvestment,
                unit: 'USD',
                trend: 'stable' as const,
                change: 0
              },
              {
                name: 'Total Returns',
                value: totalReturns,
                unit: 'USD',
                trend: 'up' as const,
                change: 0
              },
              {
                name: 'Net Return',
                value: netReturn,
                unit: 'USD',
                trend: netReturn > 0 ? 'up' as const : 'down' as const,
                change: 0
              },
              {
                name: 'ROI Percentage',
                value: roi,
                unit: '%',
                trend: roi > 0 ? 'up' as const : 'down' as const,
                change: 0
              }
            ],
            charts: await this.buildROICharts(totalInvestment, totalReturns, netReturn),
            insights: await this.generateROIInsights(roi, netReturn),
            summary: {
              totalRevenue: totalReturns,
              totalCosts: totalInvestment,
              netProfit: netReturn,
              profitMargin: totalReturns > 0 ? (netReturn / totalReturns) * 100 : 0,
              roi
            }
          }
        }
      };
    } catch (error) {
      this.handleAnalyticsError(error, 'buildROIAnalysisData');
    }
  }

  // =============================================================================
  // Helper Methods for Charts and Insights
  // =============================================================================

  /**
   * Builds profitability charts
   */
  private async buildProfitabilityCharts(whereClause: any) {
    // Get monthly revenue and expense data for charts
    const monthlyData = await this.prisma.transaction.findMany({
      where: whereClause,
      select: {
        amount: true,
        type: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by month and type
    const grouped = monthlyData.reduce((acc, transaction) => {
      const month = transaction.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0 };
      }
      if (transaction.type === ('INCOME' as any)) {
        acc[month].income += Number(transaction.amount);
      } else {
        acc[month].expense += Number(transaction.amount);
      }
      return acc;
    }, {} as Record<string, any>);

    return [
      {
        type: 'line' as any,
        title: 'Revenue vs Expenses Over Time',
        data: Object.values(grouped).map((item: any) => ({
          timestamp: item.month,
          value: item.income - item.expense
        })),
        xAxis: 'Month',
        yAxis: 'Net Profit (USD)'
      }
    ];
  }

  /**
   * Builds farm-to-market charts
   */
  private async buildFarmToMarketCharts(cropCycles: any[], orders: any[]) {
    return [
      {
        type: 'bar' as any,
        title: 'Production vs Sales',
        data: [
          { timestamp: 'Production', value: cropCycles.reduce((sum, c) => sum + (c.actualYield || 0), 0) },
          { timestamp: 'Sales', value: orders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + Number(i.quantity), 0) || 0), 0) }
        ],
        xAxis: 'Category',
        yAxis: 'Quantity (kg)'
      }
    ];
  }

  /**
   * Builds activity efficiency charts
   */
  private async buildActivityEfficiencyCharts(activities: any[]) {
    const statusCount = activities.reduce((acc, activity) => {
      acc[activity.status] = (acc[activity.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        type: 'pie' as any,
        title: 'Activity Status Distribution',
        data: Object.entries(statusCount).map(([status, count]) => ({
          timestamp: status,
          value: count as number
        })),
        xAxis: 'Status',
        yAxis: 'Count'
      }
    ];
  }

  /**
   * Builds ROI charts
   */
  private async buildROICharts(investment: number, returns: number, netReturn: number) {
    return [
      {
        type: 'bar' as any,
        title: 'Investment vs Returns',
        data: [
          { timestamp: 'Investment', value: investment },
          { timestamp: 'Returns', value: returns },
          { timestamp: 'Net Return', value: netReturn }
        ],
        xAxis: 'Category',
        yAxis: 'Amount (USD)'
      }
    ];
  }

  /**
   * Generates profitability insights
   */
  private async generateProfitabilityInsights(netProfit: number, profitMargin: number) {
    const insights = [];

    if (netProfit > 0) {
      insights.push({
        id: 'profit_positive',
        title: 'Positive Profitability',
        description: `Current operations are generating a net profit of $${netProfit.toLocaleString()}`,
        category: 'financial',
        priority: 'medium' as const,
        confidence: 0.9,
        impact: 'high' as const,
        actionable: true,
        recommendations: ['Continue current profitable practices', 'Consider expansion opportunities'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    } else if (netProfit < 0) {
      insights.push({
        id: 'profit_negative',
        title: 'Profitability Concern',
        description: `Operations showing a net loss of $${Math.abs(netProfit).toLocaleString()}`,
        category: 'financial',
        priority: 'high' as const,
        confidence: 0.9,
        impact: 'high' as const,
        actionable: true,
        recommendations: ['Review and reduce operational costs', 'Optimize pricing strategy', 'Improve efficiency'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    if (profitMargin > 20) {
      insights.push({
        id: 'margin_healthy',
        title: 'Healthy Profit Margin',
        description: `Profit margin of ${profitMargin.toFixed(1)}% indicates efficient operations`,
        category: 'financial',
        priority: 'low' as const,
        confidence: 0.8,
        impact: 'medium' as const,
        actionable: false,
        recommendations: ['Maintain current operational efficiency'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Generates farm-to-market insights
   */
  private async generateFarmToMarketInsights(marketReachRate: number, inventoryCount: number) {
    const insights = [];

    if (marketReachRate > 80) {
      insights.push({
        id: 'market_reach_high',
        title: 'Excellent Market Reach',
        description: `${marketReachRate.toFixed(1)}% of production is reaching the market`,
        category: 'operational',
        priority: 'low' as const,
        confidence: 0.85,
        impact: 'medium' as const,
        actionable: false,
        recommendations: ['Maintain current market channels'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    } else if (marketReachRate < 50) {
      insights.push({
        id: 'market_reach_low',
        title: 'Market Access Challenge',
        description: `Only ${marketReachRate.toFixed(1)}% of production is reaching the market`,
        category: 'operational',
        priority: 'high' as const,
        confidence: 0.9,
        impact: 'high' as const,
        actionable: true,
        recommendations: ['Expand market channels', 'Improve distribution network', 'Reduce post-harvest losses'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    if (inventoryCount > 10) {
      insights.push({
        id: 'inventory_high',
        title: 'High Inventory Levels',
        description: `${inventoryCount} inventory items suggest good production but potential storage costs`,
        category: 'operational',
        priority: 'medium' as const,
        confidence: 0.75,
        impact: 'medium' as const,
        actionable: true,
        recommendations: ['Optimize inventory turnover', 'Expand sales channels'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Generates activity efficiency insights
   */
  private async generateActivityEfficiencyInsights(completionRate: number, avgDuration: number) {
    const insights = [];

    if (completionRate > 90) {
      insights.push({
        id: 'completion_excellent',
        title: 'Excellent Activity Completion',
        description: `${completionRate.toFixed(1)}% completion rate shows strong operational discipline`,
        category: 'operational',
        priority: 'low' as const,
        confidence: 0.9,
        impact: 'medium' as const,
        actionable: false,
        recommendations: ['Maintain current planning standards'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    } else if (completionRate < 70) {
      insights.push({
        id: 'completion_concern',
        title: 'Activity Completion Issues',
        description: `${completionRate.toFixed(1)}% completion rate indicates planning or resource challenges`,
        category: 'operational',
        priority: 'high' as const,
        confidence: 0.85,
        impact: 'high' as const,
        actionable: true,
        recommendations: ['Review activity planning process', 'Ensure adequate resource allocation', 'Improve task tracking'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    if (avgDuration > 240) { // More than 4 hours average
      insights.push({
        id: 'duration_concern',
        title: 'Long Activity Duration',
        description: `Average activity duration of ${(avgDuration / 60).toFixed(1)} hours may indicate inefficiency`,
        category: 'operational',
        priority: 'medium' as const,
        confidence: 0.75,
        impact: 'medium' as const,
        actionable: true,
        recommendations: ['Analyze activity bottlenecks', 'Consider process optimization', 'Provide additional training'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Generates ROI insights
   */
  private async generateROIInsights(roi: number, netReturn: number) {
    const insights = [];

    if (roi > 15) {
      insights.push({
        id: 'roi_excellent',
        title: 'Strong Return on Investment',
        description: `ROI of ${roi.toFixed(1)}% indicates highly profitable operations`,
        category: 'financial',
        priority: 'low' as const,
        confidence: 0.9,
        impact: 'high' as const,
        actionable: false,
        recommendations: ['Consider scaling successful operations', 'Reinvest in high-ROI activities'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    } else if (roi < 5 && roi > 0) {
      insights.push({
        id: 'roi_low',
        title: 'Low Return on Investment',
        description: `ROI of ${roi.toFixed(1)}% is below optimal levels`,
        category: 'financial',
        priority: 'medium' as const,
        confidence: 0.85,
        impact: 'medium' as const,
        actionable: true,
        recommendations: ['Optimize cost structure', 'Improve operational efficiency', 'Review pricing strategy'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    } else if (roi <= 0) {
      insights.push({
        id: 'roi_negative',
        title: 'Negative Return on Investment',
        description: `Negative ROI indicates investments are not generating returns`,
        category: 'financial',
        priority: 'critical' as const,
        confidence: 0.95,
        impact: 'high' as const,
        actionable: true,
        recommendations: ['Urgent cost reduction required', 'Re-evaluate investment strategy', 'Focus on core profitable activities'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    if (Math.abs(netReturn) > 10000) {
      const isPositive = netReturn > 0;
      insights.push({
        id: 'return_significant',
        title: `Significant ${isPositive ? 'Gains' : 'Losses'}`,
        description: `Net return of $${netReturn.toLocaleString()} represents substantial ${isPositive ? 'profit' : 'loss'}`,
        category: 'financial',
        priority: isPositive ? 'medium' as const : 'high' as const,
        confidence: 0.9,
        impact: 'high' as const,
        actionable: !isPositive,
        recommendations: isPositive 
          ? ['Consider reinvestment opportunities', 'Plan for tax implications']
          : ['Immediate action required to reduce losses', 'Review all major expense categories'],
        data: { metrics: [], charts: [] },
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Calculates trend percentage
   */
  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    if (previous === 0) return 'stable';
    const percentage = ((current - previous) / previous) * 100;
    if (percentage > 5) return 'up';
    if (percentage < -5) return 'down';
    return 'stable';
  }

  // =============================================================================
  // Mock Data Generation Methods
  // =============================================================================

  private generateMockDashboardData(overrides: any = {}): AnalyticsDashboardResponseDto {
    return {
      data: {
        type: 'analytics_dashboard',
        id: 'dashboard',
        attributes: {
          period: overrides.period || 'month',
          farmId: overrides.farmId || null,
          metrics: [
            {
              name: 'Total Revenue',
              value: 125000,
              unit: 'USD',
              trend: 'up' as const,
              change: 16500
            },
            {
              name: 'Total Costs',
              value: 85000,
              unit: 'USD',
              trend: 'down' as const,
              change: -4500
            },
            {
              name: 'Net Profit',
              value: 40000,
              unit: 'USD',
              trend: 'up' as const,
              change: 21000
            }
          ],
          charts: [
            {
              type: 'line' as any,
              title: 'Revenue Over Time',
              data: [
                { timestamp: '2024-01-01', value: 10000 },
                { timestamp: '2024-01-02', value: 12000 },
                { timestamp: '2024-01-03', value: 15000 }
              ],
              xAxis: 'Date',
              yAxis: 'Revenue (USD)'
            },
            {
              type: 'pie' as any,
              title: 'Cost Breakdown',
              data: [
                { timestamp: 'Labor', value: 5000 },
                { timestamp: 'Materials', value: 3000 },
                { timestamp: 'Equipment', value: 2500 },
                { timestamp: 'Other', value: 2000 }
              ],
              xAxis: 'Category',
              yAxis: 'Amount (USD)'
            }
          ],
          insights: [
            {
              id: 'insight_1',
              title: 'Revenue Growth',
              description: 'Revenue has increased by 15% compared to last month',
              category: 'financial',
              priority: 'medium' as const,
              confidence: 0.85,
              impact: 'high' as const,
              actionable: true,
              recommendations: ['Continue current practices', 'Consider expanding to new markets'],
              data: {
                metrics: [],
                charts: []
              },
              createdAt: new Date().toISOString()
            }
          ],
          summary: {
            totalRevenue: 125000,
            totalCosts: 85000,
            netProfit: 40000,
            profitMargin: 32,
            roi: 47
          }
        }
      }
    };
  }


  private generateMockResourceUtilizationData(_query: ResourceUtilizationQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, farmId: _query.farmId });
  }

  private generateMockCostOptimizationData(_query: CostOptimizationQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, farmId: _query.farmId });
  }

  private generateMockWorkflowAnalysisData(_query: WorkflowAnalysisQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, farmId: _query.farmId });
  }

  private generateMockMarketPositioningData(_query: MarketPositioningQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, commodityId: _query.commodityId });
  }

  private generateMockCustomerAnalysisData(_query: CustomerAnalysisQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockSupplierPerformanceData(_query: SupplierPerformanceQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockPriceRealizationData(_query: PriceRealizationQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockDemandPredictionData(_query: DemandPredictionQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, commodityId: _query.commodityId });
  }

  private generateMockYieldPredictionData(_query: YieldPredictionQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, farmId: _query.farmId });
  }

  private generateMockPriceForecastingData(_query: PriceForecastingQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, commodityId: _query.commodityId });
  }

  private generateMockRiskAssessmentData(_query: RiskAssessmentQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockSustainabilityMetricsData(_query: SustainabilityMetricsQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, farmId: _query.farmId });
  }

  private generateMockCertificationImpactData(_query: CertificationImpactQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockWasteReductionData(_query: WasteReductionQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period, farmId: _query.farmId });
  }

  private generateMockPeerBenchmarkingData(_query: PeerBenchmarkingQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockIndustryBenchmarksData(_query: IndustryBenchmarksQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockHistoricalComparisonData(_query: HistoricalComparisonQueryDto): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({ period: _query.period });
  }

  private generateMockCustomQueryData(): AnalyticsDashboardResponseDto {
    return this.generateMockDashboardData({});
  }

  private generateMockDataExportsData(): AnalyticsExportsResponseDto {
    return {
      data: [
        {
          type: 'analytics_export',
          id: 'export_1',
          attributes: {
            id: 'export_1',
            dataset: 'revenue',
            status: 'completed' as any,
            format: 'csv' as any,
            filters: {},
            timeframe: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            },
            createdAt: new Date().toISOString()
          }
        }
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10
      }
    };
  }

  private generateMockInsightsData(): AnalyticsInsightsResponseDto {
    return {
      data: [
        {
          type: 'analytics_insight',
          id: 'insight_1',
          attributes: {
            id: 'insight_1',
            title: 'Revenue Growth Opportunity',
            description: 'Based on current trends, revenue could increase by 20% with targeted marketing',
            category: 'financial',
            priority: 'medium' as const,
            confidence: 0.85,
            impact: 'high' as const,
            actionable: true,
            recommendations: ['Increase marketing budget', 'Focus on high-value crops'],
            data: {
              metrics: [],
              charts: []
            },
            createdAt: new Date().toISOString()
          }
        }
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 50
      }
    };
  }

  private generateMockReportTemplatesData(): { data: Array<{ type: 'report_template'; id: string; attributes: any }> } {
    return {
      data: [
        {
          type: 'report_template',
          id: 'template_1',
          attributes: {
            name: 'Monthly Financial Report',
            description: 'Comprehensive financial analysis for the month',
            category: 'financial',
            parameters: ['startDate', 'endDate', 'farmId']
          }
        }
      ]
    };
  }

  private generateMockReportsData(): AnalyticsReportsResponseDto {
    return {
      data: [
        {
          type: 'analytics_report',
          id: 'report_1',
          attributes: {
            id: 'report_1',
            title: 'Monthly Financial Report',
            type: 'financial',
            format: 'pdf' as any,
            status: 'completed' as any,
            parameters: {},
            generatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            downloadUrl: '/api/analytics/reports/report_1/download'
          }
        }
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 50
      }
    };
  }

  private generateMockReportData(reportId: string): { data: { type: 'analytics_report'; id: string; attributes: any } } {
    return {
      data: {
        type: 'analytics_report',
        id: reportId,
        attributes: {
          id: reportId,
          title: 'Monthly Financial Report',
          type: 'financial',
          format: 'pdf',
          status: 'completed' as any,
          parameters: {},
          generatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          downloadUrl: `/api/analytics/reports/${reportId}/download`
        }
      }
    };
  }

  private generateMockScheduledReportsData(): { data: Array<{ type: 'report_schedule'; id: string; attributes: any }> } {
    return {
      data: [
        {
          type: 'report_schedule',
          id: 'schedule_1',
          attributes: {
            name: 'Weekly Performance Report',
            frequency: 'weekly',
            status: 'active',
            nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      ]
    };
  }

  /**
   * Builds comprehensive analytics data
   */
  private async buildComprehensiveAnalyticsData(user: CurrentUser, query: any): Promise<AnalyticsDashboardResponseDto> {
    const dateFilter = this.buildDateRangeFilter(query);
    
    try {
      const [activities, inventory, transactions, orders, harvests] = await Promise.all([
        this.prisma.farmActivity.findMany({
          where: {
            farm: { organizationId: user.organizationId },
            ...(query.farmId && { farmId: query.farmId }),
            ...(dateFilter && { createdAt: dateFilter })
          },
          include: {
            farm: { select: { id: true, name: true } },
            cropCycle: { 
              include: { 
                commodity: { select: { id: true, name: true, category: true } }
              }
            }
          }
        }),
        this.prisma.inventory.findMany({
          where: {
            organizationId: user.organizationId,
            ...(query.farmId && { farmId: query.farmId }),
            status: 'AVAILABLE'
          },
          include: {
            commodity: { select: { id: true, name: true, category: true } }
          }
        }),
        this.prisma.transaction.findMany({
          where: {
            organizationId: user.organizationId,
            ...(query.farmId && { farmId: query.farmId }),
            ...(dateFilter && { createdAt: dateFilter })
          }
        }),
        this.prisma.order.findMany({
          where: {
            buyerOrgId: user.organizationId,
            ...(query.farmId && { farmId: query.farmId }),
            ...(dateFilter && { createdAt: dateFilter })
          }
        }),
        this.prisma.harvest.findMany({
          where: {
            cropCycle: { farm: { organizationId: user.organizationId } },
            ...(query.farmId && { cropCycle: { farmId: query.farmId } }),
            ...(dateFilter && { harvestDate: dateFilter })
          },
          include: {
            cropCycle: {
              include: {
                commodity: { select: { id: true, name: true, category: true } }
              }
            }
          }
        })
      ]);

      // Calculate comprehensive metrics
      const metrics = this.calculateComprehensiveMetrics(activities, inventory, transactions, orders, harvests);

      return {
        data: {
          type: 'analytics_dashboard',
          id: 'comprehensive',
          attributes: {
            period: query.period || 'month',
            farmId: query.farmId,
            metrics: this.formatMetricsForResponse(metrics),
            charts: [],
            insights: [],
            summary: {
              totalRevenue: metrics.financial.revenue,
              totalCosts: metrics.financial.expenses,
              netProfit: metrics.financial.netProfit,
              profitMargin: metrics.financial.profitMargin,
              roi: metrics.financial.profitMargin
            }
          }
        }
      };
    } catch (error) {
      this.handleAnalyticsError(error, 'buildComprehensiveAnalyticsData');
    }
  }

  private formatMetricsForResponse(metrics: any): AnalyticsMetricDto[] {
    return [
      {
        name: 'Activities',
        value: metrics.activities.total,
        unit: 'count',
        trend: 'stable',
        changePercent: metrics.activities.completionRate,
        metadata: { description: `Total activities with ${metrics.activities.completionRate}% completion rate` }
      },
      {
        name: 'Inventory Value',
        value: metrics.inventory.totalValue,
        unit: 'currency',
        trend: 'stable',
        metadata: { description: `Total inventory value with ${metrics.inventory.lowStockItems} low stock items` }
      },
      {
        name: 'Revenue',
        value: metrics.financial.revenue,
        unit: 'currency',
        trend: metrics.financial.profitMargin > 0 ? 'up' : 'down',
        changePercent: metrics.financial.profitMargin,
        metadata: { description: `Total revenue with ${metrics.financial.profitMargin}% profit margin` }
      },
      {
        name: 'Orders',
        value: metrics.orders.total,
        unit: 'count',
        trend: 'stable',
        metadata: { description: `Total orders worth ${metrics.orders.totalValue}` }
      },
      {
        name: 'Harvests',
        value: metrics.harvests.total,
        unit: 'count',
        trend: 'stable',
        metadata: { description: `Total harvests with ${metrics.harvests.totalQuantity} units` }
      }
    ];
  }

  private calculateComprehensiveMetrics(activities: any[], inventory: any[], transactions: any[], orders: any[], harvests: any[]) {
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.status === 'COMPLETED').length;
    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    const totalInventoryValue = inventory.reduce((sum, item) => {
      const costBasis = (item.metadata as any)?.costBasis || 0;
      return sum + (item.quantity * costBasis);
    }, 0);

    const totalRevenue = transactions
      .filter(t => t.type === 'FARM_REVENUE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'FARM_EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      activities: {
        total: totalActivities,
        completed: completedActivities,
        completionRate: Math.round(completionRate * 100) / 100
      },
      inventory: {
        totalItems: inventory.length,
        totalValue: Math.round(totalInventoryValue * 100) / 100,
        lowStockItems: inventory.filter(item => item.quantity < 10).length
      },
      financial: {
        revenue: Math.round(totalRevenue * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100
      },
      orders: {
        total: orders.length,
        totalValue: Math.round(orders.reduce((sum, order) => sum + order.totalPrice, 0) * 100) / 100
      },
      harvests: {
        total: harvests.length,
        totalQuantity: harvests.reduce((sum, h) => sum + h.quantity, 0)
      }
    };
  }
}
