import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { JobQueueService } from '../common/services/job-queue.service';
import { MonitoringService } from '../common/services/monitoring.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrencyAwareService } from '../common/services/currency-aware.service';
import { CurrencyService } from '../common/services/currency.service';
import { 
  BaseAnalyticsQuery,
  FinancialQuery,
  ActivityQuery,
  MarketQuery,
  FarmToMarketQuery,
  CustomerInsightsQuery,
  ExportRequest,
  ReportRequest,
  AnalyticsResponse,
  AnalyticsMetric,
  AnalyticsChart,
  AnalyticsInsight,
  AnalyticsSummary
} from '@contracts/analytics.contract';
import { 
  DateFilter, 
  WhereClause
} from './types/analytics.types';
import { TransactionType, ActivityType, CropStatus, ActivityStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService extends CurrencyAwareService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly intelligenceService: IntelligenceService,
    private readonly jobQueueService: JobQueueService,
    private readonly monitoringService: MonitoringService,
    currencyService: CurrencyService,
  ) {
    super(prisma, currencyService);
  }

  /**
   * Get dashboard analytics with key performance indicators
   */
  async getDashboard(user: CurrentUser, query: BaseAnalyticsQuery): Promise<AnalyticsResponse> {
    const startTime = Date.now();
    this.logger.log(`Getting dashboard analytics for user: ${user.userId}`);

    // Validate input parameters
    this.validateAnalyticsQuery(query);

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('dashboard', user.organizationId, query);
      if (query.useCache) {
        const cached = await this.cacheService.get<AnalyticsResponse>(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for dashboard analytics: ${cacheKey}`);
          
          // Track cache hit performance
          const duration = Date.now() - startTime;
          this.monitoringService.trackPerformance({
            operation: 'getDashboard',
            duration,
            userId: user.userId,
            organizationId: user.organizationId,
            metadata: {
              farmId: query.farmId,
              period: query.period,
              includeInsights: query.includeInsights,
              useCache: query.useCache,
              cacheHit: true
            }
          });
          
          return cached;
        }
      }

      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = this.buildWhereClause(user, query, dateFilter);

      // Fetch key metrics in parallel with caching
      const [revenue, expenses, activities] = await Promise.all([
        this.getCachedRevenueData(whereClause, user.organizationId),
        this.getCachedExpenseData(whereClause, user.organizationId),
        this.getCachedActivityCount(whereClause, user.organizationId)
      ]);

      const revenueAmount = Number(revenue._sum.amount) || 0;
      const expenseAmount = Number(expenses._sum.amount) || 0;
      const netProfit = revenueAmount - expenseAmount;
      const profitMargin = revenueAmount > 0 ? (netProfit / revenueAmount) * 100 : 0;
      const roi = this.calculateROI(revenueAmount, expenseAmount);

      const metrics: AnalyticsMetric[] = [
        {
          name: 'Total Revenue',
          value: revenueAmount,
          unit: 'USD',
          trend: this.calculateTrend(revenueAmount, 0),
          change: revenueAmount,
          changePercent: 0
        },
        {
          name: 'Total Expenses',
          value: expenseAmount,
          unit: 'USD',
          trend: this.calculateTrend(expenseAmount, 0),
          change: expenseAmount,
          changePercent: 0
        },
        {
          name: 'Net Profit',
          value: netProfit,
          unit: 'USD',
          trend: netProfit > 0 ? 'up' : netProfit < 0 ? 'down' : 'stable',
          change: netProfit,
          changePercent: profitMargin
        },
        {
          name: 'Active Activities',
          value: activities,
          unit: 'count',
          trend: 'stable'
        }
      ];

      const charts: AnalyticsChart[] = [
        {
          type: 'bar',
          title: 'Revenue vs Expenses',
          data: [
            { label: 'Revenue', value: revenueAmount, timestamp: new Date().toISOString() },
            { label: 'Expenses', value: expenseAmount, timestamp: new Date().toISOString() }
          ],
          xAxis: 'Category',
          yAxis: 'Amount (USD)'
        }
      ];

      const summary: AnalyticsSummary = {
        totalRevenue: revenueAmount,
        totalCosts: expenseAmount,
        netProfit,
        profitMargin,
        roi,
        efficiency: this.calculateEfficiency(activities, revenueAmount),
        sustainability: await this.calculateSustainability(whereClause)
      };

      const response: AnalyticsResponse = {
        data: {
          type: 'analytics_dashboard',
          id: 'dashboard',
          attributes: {
            period: query.period || 'month',
            farmId: query.farmId,
            metrics,
            charts,
            insights: query.includeInsights ? await this.getCachedInsights(user, query) : undefined,
            summary,
            generatedAt: new Date().toISOString(),
            cacheKey: query.useCache ? cacheKey : undefined
          }
        }
      };

      // Cache the response
      if (query.useCache) {
        await this.cacheService.set(cacheKey, response, 120); // 2 minutes (reduced TTL for fresher data)
      }

      // Track performance metrics
      const duration = Date.now() - startTime;
      this.monitoringService.trackPerformance({
        operation: 'getDashboard',
        duration,
        userId: user.userId,
        organizationId: user.organizationId,
        metadata: {
          farmId: query.farmId,
          period: query.period,
          includeInsights: query.includeInsights,
          useCache: query.useCache,
          cacheHit: false
        }
      });

      this.logger.log(`Dashboard analytics completed in ${duration}ms for user: ${user.userId}`);
      return response;
    } catch (error) {
      this.logger.error(`Dashboard analytics failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve dashboard analytics');
    }
  }

  /**
   * Get financial performance analytics
   */
  async getFinancialAnalytics(user: CurrentUser, query: FinancialQuery): Promise<AnalyticsResponse> {
    this.logger.log(`Getting financial analytics for user: ${user.userId}`);

    // Validate input parameters
    this.validateAnalyticsQuery(query);

    try {
      const cacheKey = this.generateCacheKey('financial', user.organizationId, query);
      if (query.useCache) {
        const cached = await this.cacheService.get<AnalyticsResponse>(cacheKey);
        if (cached) return cached;
      }

      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = this.buildWhereClause(user, query, dateFilter);

      const [revenue, expenses, orders] = await Promise.all([
        this.getRevenueData(whereClause),
        this.getExpenseData(whereClause),
        this.getOrderData(user.organizationId, dateFilter)
      ]);

      const revenueAmount = Number(revenue._sum.amount) || 0;
      const expenseAmount = Number(expenses._sum.amount) || 0;
      const netProfit = revenueAmount - expenseAmount;
      const profitMargin = revenueAmount > 0 ? (netProfit / revenueAmount) * 100 : 0;
      const avgOrderValue = orders.length > 0 ? revenueAmount / orders.length : 0;

      const response = this.buildAnalyticsResponse('financial', query, {
        metrics: this.buildFinancialMetrics(revenueAmount, expenseAmount, profitMargin, avgOrderValue),
        charts: this.buildFinancialCharts(revenueAmount, expenseAmount),
        summary: this.buildFinancialSummary(revenueAmount, expenseAmount, netProfit, profitMargin)
      });

      if (query.useCache) {
        await this.cacheService.set(cacheKey, response, 300);
      }

      return response;
    } catch (error) {
      this.logger.error(`Financial analytics failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve financial analytics');
    }
  }

  /**
   * Get farm-to-market journey analytics
   */
  async getFarmToMarketAnalytics(user: CurrentUser, query: FarmToMarketQuery): Promise<AnalyticsResponse> {
    this.logger.log(`Getting farm-to-market analytics for user: ${user.userId}`);

    try {
      const cacheKey = this.generateCacheKey('farm-to-market', user.organizationId, query);
      if (query.useCache) {
        const cached = await this.cacheService.get<AnalyticsResponse>(cacheKey);
        if (cached) return cached;
      }

      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = this.buildWhereClause(user, query, dateFilter);

      // Get comprehensive farm-to-market data using our helper methods
      const [productionData, marketData, qualityData, cropCycles, harvests] = await Promise.all([
        this.getProductionData(whereClause, query.commodityId),
        this.getMarketData(whereClause, query.commodityId),
        query.includeQuality ? this.getQualityData(whereClause, query.commodityId) : null,
        this.getCropCycleData(whereClause),
        this.getHarvestData(whereClause)
      ]);

      const response = this.buildAnalyticsResponse('farm-to-market', query, {
        metrics: this.buildFarmToMarketMetrics(productionData, marketData, qualityData, cropCycles, harvests),
        charts: this.buildFarmToMarketCharts(productionData, marketData, cropCycles, harvests),
        summary: this.buildFarmToMarketSummary(productionData, marketData, cropCycles, harvests)
      });

      if (query.useCache) {
        await this.cacheService.set(cacheKey, response, 300);
      }

      return response;
    } catch (error) {
      this.logger.error(`Farm-to-market analytics failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve farm-to-market analytics');
    }
  }

  /**
   * Get activity analytics
   */
  async getActivityAnalytics(user: CurrentUser, query: ActivityQuery): Promise<AnalyticsResponse> {
    this.logger.log(`Getting activity analytics for user: ${user.userId}`);

    try {
      const cacheKey = this.generateCacheKey('activities', user.organizationId, query);
      if (query.useCache) {
        const cached = await this.cacheService.get<AnalyticsResponse>(cacheKey);
        if (cached) return cached;
      }

      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = this.buildWhereClause(user, query, dateFilter);

      const [activities, efficiency, costs] = await Promise.all([
        this.getActivityData(whereClause, query.activityType),
        query.includeEfficiency ? this.getEfficiencyData(whereClause) : null,
        query.includeCosts ? this.getActivityCosts(whereClause) : null
      ]);

      const response = this.buildAnalyticsResponse('activities', query, {
        metrics: this.buildActivityMetrics(activities, efficiency, costs),
        charts: this.buildActivityCharts(activities, efficiency),
        summary: this.buildActivitySummary(activities, costs)
      });

      if (query.useCache) {
        await this.cacheService.set(cacheKey, response, 300);
      }

      return response;
    } catch (error) {
      this.logger.error(`Activity analytics failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve activity analytics');
    }
  }

  /**
   * Get market analytics
   */
  async getMarketAnalytics(user: CurrentUser, query: MarketQuery): Promise<AnalyticsResponse> {
    this.logger.log(`Getting market analytics for user: ${user.userId}`);

    try {
      const cacheKey = this.generateCacheKey('market', user.organizationId, query);
      if (query.useCache) {
        const cached = await this.cacheService.get<AnalyticsResponse>(cacheKey);
        if (cached) return cached;
      }

      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = this.buildWhereClause(user, query, dateFilter);

      const [salesData, customerData, pricingData] = await Promise.all([
        this.getSalesData(whereClause, query.commodityId),
        this.getCustomerData(whereClause),
        query.includePredictions ? this.getPricingData(whereClause, query.commodityId) : null
      ]);

      const response = this.buildAnalyticsResponse('market', query, {
        metrics: this.buildMarketMetrics(salesData, customerData, pricingData),
        charts: this.buildMarketCharts(salesData, customerData),
        summary: this.buildMarketSummary(salesData, customerData)
      });

      if (query.useCache) {
        await this.cacheService.set(cacheKey, response, 300);
      }

      return response;
    } catch (error) {
      this.logger.error(`Market analytics failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve market analytics');
    }
  }

  /**
   * Get AI-powered insights
   */
  async getInsights(user: CurrentUser, query: BaseAnalyticsQuery): Promise<any> {
    this.logger.log(`Getting AI insights for user: ${user.userId}`);

    try {
      const cacheKey = this.generateCacheKey('insights', user.organizationId, query);
      if (query.useCache) {
        const cached = await this.cacheService.get<any>(cacheKey);
        if (cached) return cached;
      }

      // Use intelligence service to generate insights
      const insights = await this.intelligenceService.analyzeFarm({
        farmId: query.farmId || '',
        analysisType: 'yield_prediction',
        data: await this.getFarmDataForAnalysis(user, query),
        userId: user.userId
      });

      const response = {
        data: {
          type: 'analytics_insights',
          id: 'insights',
          attributes: {
            insights: this.transformIntelligenceToInsights(insights),
            generatedAt: new Date().toISOString(),
            model: 'gpt-4',
            confidence: insights.confidence || 0.8
          }
        }
      };

      if (query.useCache) {
        await this.cacheService.set(cacheKey, response, 600); // 10 minutes
      }

      return response;
    } catch (error) {
      this.logger.error(`Insights generation failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to generate insights');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(user: CurrentUser, request: ExportRequest): Promise<any> {
    this.logger.log(`Exporting ${request.type} analytics for user: ${user.userId}`);

    try {
      // Create job data
      const jobData = {
        userId: user.userId,
        organizationId: user.organizationId,
        type: request.type,
        format: request.format,
        period: request.period,
        farmId: request.farmId,
        includeCharts: request.includeCharts,
        includeInsights: request.includeInsights
      };

      // Add export job to queue
      const jobId = await this.jobQueueService.addJob('analytics_export', jobData, 5); // High priority

      return {
        data: {
          type: 'analytics_export',
          id: jobId,
          attributes: {
            status: 'processing',
            downloadUrl: `/api/analytics/exports/${jobId}/download`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
          }
        }
      };
    } catch (error) {
      this.logger.error(`Export failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to export analytics');
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(user: CurrentUser, request: ReportRequest): Promise<any> {
    this.logger.log(`Generating ${request.type} report for user: ${user.userId}`);

    try {
      // Create job data
      const jobData = {
        userId: user.userId,
        organizationId: user.organizationId,
        title: request.title,
        type: request.type,
        format: request.format,
        period: request.period,
        farmIds: request.farmIds,
        commodities: request.commodities,
        includeComparisons: request.includeComparisons,
        includePredictions: request.includePredictions,
        recipients: request.recipients
      };

      // Add report generation job to queue
      const jobId = await this.jobQueueService.addJob('analytics_report', jobData, 3); // Medium priority

      return {
        data: {
          type: 'analytics_report',
          id: jobId,
          attributes: {
            status: 'generating',
            title: request.title,
            type: request.type,
            format: request.format,
            downloadUrl: `/api/analytics/reports/${jobId}/download`,
            estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
            recipients: request.recipients
          }
        }
      };
    } catch (error) {
      this.logger.error(`Report generation failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to generate report');
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private buildDateFilter(period: string = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      gte: startDate,
      lte: now
    };
  }

  /**
   * Get cached revenue data or fetch from database
   */
  private async getCachedRevenueData(whereClause: WhereClause, organizationId: string) {
    const farmPart = whereClause.farmId ?? 'all-farms';
    const startDate = whereClause.createdAt?.gte?.toISOString() ?? 'no-start';
    const endDate = whereClause.createdAt?.lte?.toISOString() ?? 'no-end';
    const cacheKey = `revenue:${organizationId}:${farmPart}:${startDate}:${endDate}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for revenue data: ${cacheKey}`);
        return cached;
      }

      const data = await this.getRevenueData(whereClause);
      await this.cacheService.set(cacheKey, data, 120); // 2 minutes (reduced TTL for fresher data)
      return data;
    } catch (error) {
      this.logger.warn('Failed to get cached revenue data, fetching directly:', error);
      return this.getRevenueData(whereClause);
    }
  }

  /**
   * Get cached expense data or fetch from database
   */
  private async getCachedExpenseData(whereClause: WhereClause, organizationId: string) {
    const farmPart = whereClause.farmId ?? 'all-farms';
    const startDate = whereClause.createdAt?.gte?.toISOString() ?? 'no-start';
    const endDate = whereClause.createdAt?.lte?.toISOString() ?? 'no-end';
    const cacheKey = `expense:${organizationId}:${farmPart}:${startDate}:${endDate}`;

    try {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for expense data: ${cacheKey}`);
        return cached;
      }

      const data = await this.getExpenseData(whereClause);
      await this.cacheService.set(cacheKey, data, 120); // 2 minutes (reduced TTL for fresher data)
      return data;
    } catch (error) {
      this.logger.warn('Failed to get cached expense data, fetching directly:', error);
      return this.getExpenseData(whereClause);
    }
  }

  /**
   * Get cached activity count or fetch from database
   */
  private async getCachedActivityCount(whereClause: WhereClause, organizationId: string) {
    const farmPart = whereClause.farmId ?? 'all-farms';
    const startDate = whereClause.createdAt?.gte?.toISOString() ?? 'no-start';
    const endDate = whereClause.createdAt?.lte?.toISOString() ?? 'no-end';
    const cacheKey = `activities:${organizationId}:${farmPart}:${startDate}:${endDate}`;

    try {
      const cached = await this.cacheService.get<number>(cacheKey);
      if (cached !== undefined) {
        this.logger.debug(`Cache hit for activity count: ${cacheKey}`);
        return cached;
      }

      const data = await this.getActivityCount(whereClause);
      await this.cacheService.set(cacheKey, data, 120); // 2 minutes (reduced TTL for fresher data)
      return data;
    } catch (error) {
      this.logger.warn('Failed to get cached activity count, fetching directly:', error);
      return this.getActivityCount(whereClause);
    }
  }

  private async getRevenueData(whereClause: WhereClause) {
    return this.prisma.transaction.aggregate({
      where: { ...whereClause, type: TransactionType.FARM_REVENUE },
      _sum: { amount: true },
      _count: { id: true }
    });
  }

  private async getExpenseData(whereClause: WhereClause) {
    return this.prisma.transaction.aggregate({
      where: { ...whereClause, type: TransactionType.FARM_EXPENSE },
      _sum: { amount: true },
      _count: { id: true }
    });
  }

  private async getActivityCount(whereClause: WhereClause) {
    const result = await this.prisma.farmActivity.count({
      where: {
        farm: {
          organizationId: whereClause.organizationId
        },
        ...(whereClause.farmId && { farmId: whereClause.farmId }),
        ...(whereClause.createdAt && { createdAt: whereClause.createdAt })
      }
    });
    return result;
  }

  private async getOrderData(organizationId: string, dateFilter?: DateFilter) {
    try {
      return await this.prisma.order.findMany({
        where: {
          buyerOrgId: organizationId,
          ...(dateFilter && { createdAt: dateFilter })
        },
        take: 100
      });
    } catch (error) {
      this.logger.warn('Failed to fetch order data:', error);
      return [];
    }
  }

  private async getCropCycleData(whereClause: any) {
    try {
      return await this.prisma.cropCycle.findMany({
        where: {
          ...(whereClause.farmId && { farmId: whereClause.farmId }),
          ...(whereClause.createdAt && { createdAt: whereClause.createdAt })
        },
        select: {
          id: true,
          status: true,
          plantingDate: true,
          harvestDate: true,
          commodity: {
            select: { name: true }
          }
        },
        take: 100
      });
    } catch (error) {
      this.logger.warn('Failed to fetch crop cycle data:', error);
      return [];
    }
  }

  private async getHarvestData(whereClause: any) {
    try {
      return await this.prisma.harvest.findMany({
        where: {
          cropCycle: {
            ...(whereClause.farmId && { farmId: whereClause.farmId })
          }
        },
        select: {
          id: true,
          quantity: true,
          harvestDate: true,
          cropCycle: {
            select: {
              commodity: { select: { name: true } }
            }
          }
        },
        take: 100
      });
    } catch (error) {
      this.logger.warn('Failed to fetch harvest data:', error);
      return [];
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // =============================================================================
  // Missing Helper Methods
  // =============================================================================

  private buildWhereClause(user: CurrentUser, query: any, dateFilter?: DateFilter): WhereClause {
    return {
      organizationId: user.organizationId,
      ...(query.farmId && { farmId: query.farmId }),
      ...(dateFilter && { createdAt: dateFilter })
    };
  }

  private generateCacheKey(type: string, organizationId: string, query: any): string {
    const queryHash = this.cacheService.generateQueryHash(query);
    return `analytics:${type}:${organizationId}:${queryHash}`;
  }

  private buildAnalyticsResponse(type: string, query: any, data: any): AnalyticsResponse {
    return {
      data: {
        type: `analytics_${type}`,
        id: type,
        attributes: {
          period: query.period || 'month',
          farmId: query.farmId,
          metrics: data.metrics || [],
          charts: data.charts || [],
          insights: query.includeInsights ? data.insights : undefined,
          summary: data.summary || this.buildDefaultSummary(),
          generatedAt: new Date().toISOString(),
          cacheKey: query.useCache ? this.generateCacheKey(type, '', query) : undefined
        }
      }
    };
  }

  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }

  private calculateROI(revenue: number, costs: number): number {
    if (costs <= 0) return revenue > 0 ? 100 : 0; // If no costs but revenue, 100% ROI
    return ((revenue - costs) / costs) * 100;
  }

  private calculateEfficiency(activities: number, revenue: number): number {
    return activities > 0 ? (revenue / activities) : 0;
  }

  private async calculateSustainability(whereClause: WhereClause): Promise<number> {
    try {
      // Calculate sustainability based on resource efficiency, waste reduction, and environmental impact
      const [resourceEfficiency, wasteReduction, environmentalImpact] = await Promise.all([
        this.calculateResourceEfficiency(whereClause),
        this.calculateWasteReduction(whereClause),
        this.calculateEnvironmentalImpact(whereClause)
      ]);

      // Weighted sustainability score (0-100)
      const sustainabilityScore = (
        resourceEfficiency * 0.4 +  // 40% weight - input/output efficiency
        wasteReduction * 0.3 +      // 30% weight - activity completion and cost efficiency  
        environmentalImpact * 0.3   // 30% weight - sustainable farming practices
      );

      return Math.round(Math.max(0, Math.min(100, sustainabilityScore)));
    } catch (error) {
      this.logger.warn('Failed to calculate sustainability score:', error);
      // Return a reasonable default based on limited data
      return 65; // Slightly positive default assuming basic sustainable practices
    }
  }

  private buildDefaultSummary(): AnalyticsSummary {
    return {
      totalRevenue: 0,
      totalCosts: 0,
      netProfit: 0,
      profitMargin: 0,
      roi: 0
    };
  }

  /**
   * Get cached insights or generate new ones
   */
  private async getCachedInsights(user: CurrentUser, query: BaseAnalyticsQuery): Promise<AnalyticsInsight[]> {
    const insightsCacheKey = `insights:${user.organizationId}:${query.farmId}:${query.period}`;
    
    try {
      // Try to get from cache first
      const cached = await this.cacheService.get<AnalyticsInsight[]>(insightsCacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for insights: ${insightsCacheKey}`);
        return cached;
      }

      // Generate new insights
      const insights = await this.generateInsights(user, query);
      
      // Cache the insights for 1 hour (longer than dashboard cache)
      await this.cacheService.set(insightsCacheKey, insights, 3600);
      
      return insights;
    } catch (error) {
      this.logger.warn('Failed to get cached insights, returning empty array:', error);
      return [];
    }
  }

  private async generateInsights(user: CurrentUser, query: BaseAnalyticsQuery): Promise<AnalyticsInsight[]> {
    try {
      const insights = await this.intelligenceService.analyzeFarm({
        farmId: query.farmId || '',
        analysisType: 'yield_prediction',
        data: await this.getFarmDataForAnalysis(user, query),
        userId: user.userId
      });

      return this.transformIntelligenceToInsights(insights);
    } catch (error) {
      this.logger.warn('Failed to generate insights:', error);
      return [];
    }
  }

  private transformIntelligenceToInsights(insights: any): AnalyticsInsight[] {
    return [
      {
        id: this.generateUUID(),
        title: 'AI-Generated Insight',
        description: insights.insights?.[0] || 'No insights available',
        category: 'performance',
        priority: 'medium',
        actionable: true,
        confidence: insights.confidence || 0.8,
        recommendations: insights.recommendations || []
      }
    ];
  }

  private async getFarmDataForAnalysis(user: CurrentUser, query: BaseAnalyticsQuery) {
    return {
      farmId: query.farmId,
      period: query.period,
      organizationId: user.organizationId
    };
  }

  // Data fetching methods for enhanced analytics
  private async getProductionData(whereClause: WhereClause, cropCycleId?: string) {
    const whereCondition = {
      ...whereClause,
      ...(cropCycleId && { id: cropCycleId })
    };

    const [totalCycles, completedCycles, totalYield] = await Promise.all([
      this.safeDatabaseOperation(
        () => this.prisma.cropCycle.count({ where: whereCondition }),
        'getProductionData - totalCycles',
        0
      ),
      this.safeDatabaseOperation(
        () => this.prisma.cropCycle.count({ where: { ...whereCondition, status: CropStatus.COMPLETED } }),
        'getProductionData - completedCycles',
        0
      ),
      this.safeDatabaseOperation(
        () => this.prisma.cropCycle.aggregate({
          where: whereCondition,
          _sum: { actualYield: true }
        }),
        'getProductionData - totalYield',
        { _sum: { actualYield: null } }
      )
    ]);

    return {
      totalCycles,
      completedCycles,
      totalYield: Number(totalYield._sum.actualYield) || 0
    };
  }

  private async getMarketData(whereClause: WhereClause, commodityId?: string) {
    try {
      const orderWhere = {
        buyerOrgId: whereClause.organizationId,
        ...(whereClause.createdAt && { createdAt: whereClause.createdAt }),
        ...(commodityId && {
          items: {
            some: {
              commodityId: commodityId
            }
          }
        })
      };

      const [totalOrders, totalSales, avgPrice] = await Promise.all([
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.order.aggregate({
          where: orderWhere,
          _sum: { totalPrice: true }
        }),
        this.prisma.order.aggregate({
          where: orderWhere,
          _avg: { totalPrice: true }
        })
      ]);

      return {
        totalOrders,
        totalSales: Number(totalSales._sum.totalPrice) || 0,
        avgPrice: Number(avgPrice._avg.totalPrice) || 0
      };
    } catch (error) {
      this.logger.warn('Failed to get market data:', error);
      return { totalOrders: 0, totalSales: 0, avgPrice: 0 };
    }
  }

  private async getQualityData(whereClause: WhereClause, cropCycleId?: string) {
    try {
      const harvestWhere = {
        ...(cropCycleId && { cropCycleId }),
        ...(whereClause.createdAt && { harvestDate: whereClause.createdAt })
      };

      const qualityData = await this.prisma.harvest.aggregate({
        where: harvestWhere,
        _avg: { quantity: true },
        _count: { id: true }
      });

      return {
        avgQuality: Number(qualityData._avg.quantity) || 0,
        qualityDistribution: {
          excellent: 0, // TODO: Implement quality distribution calculation
          good: 0,
          fair: 0,
          poor: 0
        }
      };
    } catch (error) {
      this.logger.warn('Failed to get quality data:', error);
      return { avgQuality: 0, qualityDistribution: {} };
    }
  }

  private async getActivityData(whereClause: WhereClause, activityType?: string) {
    try {
      // Remove organizationId from whereClause as FarmActivity doesn't have this field
      const baseWhere = { ...whereClause };
      delete baseWhere.organizationId;

      const activityWhere = {
        ...baseWhere,
        ...(activityType && { type: activityType as any })
      };

      const [totalActivities, completedActivities, avgDuration] = await Promise.all([
        this.prisma.farmActivity.count({ where: activityWhere }),
        this.prisma.farmActivity.count({ where: { ...activityWhere, status: ActivityStatus.COMPLETED } }),
        this.prisma.farmActivity.aggregate({
          where: activityWhere,
          _avg: { actualDuration: true }
        })
      ]);

      return {
        totalActivities,
        completedActivities,
        avgDuration: Number(avgDuration._avg.actualDuration) || 0
      };
    } catch (error) {
      this.logger.warn('Failed to get activity data:', error);
      return { totalActivities: 0, completedActivities: 0, avgDuration: 0 };
    }
  }

  private async getEfficiencyData(whereClause: WhereClause) {
    try {
      // Remove organizationId from whereClause as FarmActivity doesn't have this field
      const activityWhere = { ...whereClause };
      delete activityWhere.organizationId;

      const [activities, revenue] = await Promise.all([
        this.prisma.farmActivity.count({ where: activityWhere }),
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: TransactionType.FARM_REVENUE },
          _sum: { amount: true }
        })
      ]);

      const revenueAmount = Number(revenue._sum.amount) || 0;
      const efficiency = activities > 0 ? (revenueAmount / activities) : 0;
      const resourceUtilization = activities > 0 ? Math.min(100, (activities / 10) * 100) : 0;

      return {
        efficiency,
        resourceUtilization
      };
    } catch (error) {
      this.logger.warn('Failed to get efficiency data:', error);
      return { efficiency: 0, resourceUtilization: 0 };
    }
  }

  private async getActivityCosts(whereClause: WhereClause) {
    try {
      // Remove organizationId from whereClause as FarmActivity doesn't have this field
      const activityWhere = { ...whereClause };
      delete activityWhere.organizationId;

      const [totalCosts, activityCount] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: TransactionType.FARM_EXPENSE },
          _sum: { amount: true }
        }),
        this.prisma.farmActivity.count({ where: activityWhere })
      ]);

      const totalCostAmount = Number(totalCosts._sum.amount) || 0;
      const avgCostPerActivity = activityCount > 0 ? totalCostAmount / activityCount : 0;

      return {
        totalCosts: totalCostAmount,
        avgCostPerActivity
      };
    } catch (error) {
      this.logger.warn('Failed to get activity costs:', error);
      return { totalCosts: 0, avgCostPerActivity: 0 };
    }
  }

  private async getSalesData(whereClause: WhereClause, commodityId?: string) {
    try {
      const orderWhere = {
        buyerOrgId: whereClause.organizationId,
        ...(whereClause.createdAt && { createdAt: whereClause.createdAt }),
        ...(commodityId && {
          items: {
            some: {
              commodityId: commodityId
            }
          }
        })
      };

      const [totalSales, avgOrderValue, customerCount] = await Promise.all([
        this.prisma.order.aggregate({
          where: orderWhere,
          _sum: { totalPrice: true }
        }),
        this.prisma.order.aggregate({
          where: orderWhere,
          _avg: { totalPrice: true }
        }),
        this.prisma.order.groupBy({
          by: ['buyerOrgId'],
          where: orderWhere,
          _count: { buyerOrgId: true }
        })
      ]);

      return {
        totalSales: Number(totalSales._sum.totalPrice) || 0,
        avgOrderValue: Number(avgOrderValue._avg.totalPrice) || 0,
        customerCount: customerCount.length
      };
    } catch (error) {
      this.logger.warn('Failed to get sales data:', error);
      return { totalSales: 0, avgOrderValue: 0, customerCount: 0 };
    }
  }

  private async getCustomerData(whereClause: WhereClause) {
    try {
      const orderWhere = {
        buyerOrgId: whereClause.organizationId,
        ...(whereClause.createdAt && { createdAt: whereClause.createdAt })
      };

      const [totalCustomers, repeatCustomers, avgOrderFrequency] = await Promise.all([
        this.prisma.order.groupBy({
          by: ['buyerOrgId'],
          where: orderWhere,
          _count: { buyerOrgId: true }
        }),
        this.prisma.order.groupBy({
          by: ['buyerOrgId'],
          where: orderWhere,
          _count: { buyerOrgId: true }
        }).then(results => results.filter(r => r._count.buyerOrgId > 1)),
        this.prisma.order.aggregate({
          where: orderWhere,
          _count: { id: true }
        })
      ]);

      const totalCustomerCount = totalCustomers.length;
      const repeatCustomerCount = repeatCustomers.length;
      const totalOrders = avgOrderFrequency._count.id;
      const avgFrequency = totalCustomerCount > 0 ? totalOrders / totalCustomerCount : 0;

      return {
        totalCustomers: totalCustomerCount,
        repeatCustomers: repeatCustomerCount,
        avgOrderFrequency: avgFrequency
      };
    } catch (error) {
      this.logger.warn('Failed to get customer data:', error);
      return { totalCustomers: 0, repeatCustomers: 0, avgOrderFrequency: 0 };
    }
  }

  private async getPricingData(whereClause: WhereClause, commodityId?: string) {
    try {
      const orderWhere = {
        buyerOrgId: whereClause.organizationId,
        ...(whereClause.createdAt && { createdAt: whereClause.createdAt }),
        ...(commodityId && {
          items: {
            some: {
              commodityId: commodityId
            }
          }
        })
      };

      const avgPrice = await this.prisma.order.aggregate({
        where: orderWhere,
        _avg: { totalPrice: true }
      });

      const avgPriceValue = Number(avgPrice._avg.totalPrice) || 0;
      
      // Simple trend calculation based on recent vs older orders
      const recentOrders = await this.prisma.order.aggregate({
        where: {
          ...orderWhere,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        _avg: { totalPrice: true }
      });

      const recentAvg = Number(recentOrders._avg.totalPrice) || 0;
      const priceTrend = recentAvg > avgPriceValue ? 'up' : recentAvg < avgPriceValue ? 'down' : 'stable';

      return {
        avgPrice: avgPriceValue,
        priceTrend,
        predictions: [] // TODO: Implement price prediction logic
      };
    } catch (error) {
      this.logger.warn('Failed to get pricing data:', error);
      return { avgPrice: 0, priceTrend: 'stable', predictions: [] };
    }
  }

  // Metric building methods
  private buildFinancialMetrics(revenue: number, expenses: number, profitMargin: number, avgOrderValue: number): AnalyticsMetric[] {
    return [
      {
        name: 'Total Revenue',
        value: revenue,
        unit: 'USD',
        trend: this.calculateTrend(revenue, 0)
      },
      {
        name: 'Total Expenses',
        value: expenses,
        unit: 'USD',
        trend: this.calculateTrend(expenses, 0)
      },
      {
        name: 'Profit Margin',
        value: profitMargin,
        unit: '%',
        trend: profitMargin > 0 ? 'up' : 'down'
      },
      {
        name: 'Average Order Value',
        value: avgOrderValue,
        unit: 'USD',
        trend: 'stable'
      }
    ];
  }

  private buildFinancialCharts(revenue: number, expenses: number): AnalyticsChart[] {
    return [
      {
        type: 'pie',
        title: 'Revenue vs Expenses',
        data: [
          { label: 'Revenue', value: revenue, timestamp: new Date().toISOString() },
          { label: 'Expenses', value: expenses, timestamp: new Date().toISOString() }
        ],
        xAxis: 'Category',
        yAxis: 'Amount (USD)'
      }
    ];
  }

  private buildFinancialSummary(revenue: number, expenses: number, netProfit: number, profitMargin: number): AnalyticsSummary {
    return {
      totalRevenue: revenue,
      totalCosts: expenses,
      netProfit,
      profitMargin,
      roi: this.calculateROI(revenue, expenses)
    };
  }

  private buildActivityMetrics(activities: any, efficiency: any, costs: any): AnalyticsMetric[] {
    const completionRate = activities.totalActivities > 0 ? (activities.completedActivities / activities.totalActivities) * 100 : 0;
    const avgDuration = activities.avgDuration || 0;
    const costPerActivity = costs?.avgCostPerActivity || 0;

    return [
      {
        name: 'Activity Completion Rate',
        value: Math.round(completionRate * 100) / 100,
        unit: '%',
        trend: completionRate >= 80 ? 'up' : completionRate >= 60 ? 'stable' : 'down'
      },
      {
        name: 'Average Duration',
        value: Math.round(avgDuration * 100) / 100,
        unit: 'hours',
        trend: avgDuration <= 8 ? 'up' : avgDuration <= 12 ? 'stable' : 'down'
      },
      {
        name: 'Cost per Activity',
        value: Math.round(costPerActivity * 100) / 100,
        unit: 'USD',
        trend: costPerActivity <= 100 ? 'up' : costPerActivity <= 200 ? 'stable' : 'down'
      },
      {
        name: 'Resource Efficiency',
        value: Math.round((efficiency?.efficiency || 0) * 100) / 100,
        unit: 'USD/activity',
        trend: (efficiency?.efficiency || 0) >= 1000 ? 'up' : (efficiency?.efficiency || 0) >= 500 ? 'stable' : 'down'
      }
    ];
  }

  private buildActivityCharts(activities: any, efficiency: any): AnalyticsChart[] {
    return [
      {
        type: 'bar',
        title: 'Activity Completion by Type',
        data: [
          { label: 'Completed', value: activities.completedActivities, timestamp: new Date().toISOString() },
          { label: 'Pending', value: activities.totalActivities - activities.completedActivities, timestamp: new Date().toISOString() }
        ],
        xAxis: 'Status',
        yAxis: 'Count'
      },
      {
        type: 'line',
        title: 'Resource Efficiency Trend',
        data: [
          { label: 'Efficiency', value: efficiency?.efficiency || 0, timestamp: new Date().toISOString() },
          { label: 'Utilization', value: efficiency?.resourceUtilization || 0, timestamp: new Date().toISOString() }
        ],
        xAxis: 'Metric',
        yAxis: 'Value'
      }
    ];
  }

  private buildActivitySummary(activities: any, costs: any): AnalyticsSummary {
    const completionRate = activities.totalActivities > 0 ? (activities.completedActivities / activities.totalActivities) * 100 : 0;
    const totalCosts = costs?.totalCosts || 0;
    
    return {
      totalRevenue: 0, // Activities don't directly generate revenue
      totalCosts: totalCosts,
      netProfit: -totalCosts, // Activities are costs
      profitMargin: 0,
      roi: 0,
      efficiency: completionRate,
      sustainability: 0
    };
  }

  private buildMarketMetrics(salesData: any, customerData: any, pricingData: any): AnalyticsMetric[] {
    const totalSales = salesData.totalSales || 0;
    const avgOrderValue = salesData.avgOrderValue || 0;
    const customerCount = salesData.customerCount || 0;
    const repeatCustomers = customerData?.repeatCustomers || 0;
    const totalCustomers = customerData?.totalCustomers || 0;
    const avgPrice = pricingData?.avgPrice || 0;

    return [
      {
        name: 'Total Sales',
        value: Math.round(totalSales * 100) / 100,
        unit: 'USD',
        trend: totalSales > 0 ? 'up' : 'stable'
      },
      {
        name: 'Average Order Value',
        value: Math.round(avgOrderValue * 100) / 100,
        unit: 'USD',
        trend: avgOrderValue >= 500 ? 'up' : avgOrderValue >= 200 ? 'stable' : 'down'
      },
      {
        name: 'Customer Count',
        value: customerCount,
        unit: 'customers',
        trend: customerCount > 0 ? 'up' : 'stable'
      },
      {
        name: 'Customer Retention',
        value: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100 * 100) / 100 : 0,
        unit: '%',
        trend: repeatCustomers / totalCustomers >= 0.3 ? 'up' : repeatCustomers / totalCustomers >= 0.1 ? 'stable' : 'down'
      },
      {
        name: 'Average Price',
        value: Math.round(avgPrice * 100) / 100,
        unit: 'USD',
        trend: pricingData?.priceTrend || 'stable'
      }
    ];
  }

  private buildMarketCharts(salesData: any, customerData: any): AnalyticsChart[] {
    return [
      {
        type: 'bar',
        title: 'Sales Performance',
        data: [
          { label: 'Total Sales', value: salesData.totalSales || 0, timestamp: new Date().toISOString() },
          { label: 'Avg Order Value', value: salesData.avgOrderValue || 0, timestamp: new Date().toISOString() }
        ],
        xAxis: 'Metric',
        yAxis: 'Value (USD)'
      },
      {
        type: 'pie',
        title: 'Customer Distribution',
        data: [
          { label: 'New Customers', value: (customerData.totalCustomers || 0) - (customerData.repeatCustomers || 0), timestamp: new Date().toISOString() },
          { label: 'Repeat Customers', value: customerData.repeatCustomers || 0, timestamp: new Date().toISOString() }
        ],
        xAxis: 'Customer Type',
        yAxis: 'Count'
      }
    ];
  }

  private buildMarketSummary(salesData: any, customerData: any): AnalyticsSummary {
    const totalSales = salesData.totalSales || 0;
    const totalCustomers = customerData.totalCustomers || 0;
    const repeatCustomers = customerData.repeatCustomers || 0;
    
    return {
      totalRevenue: totalSales,
      totalCosts: 0, // Market data doesn't include costs
      netProfit: totalSales,
      profitMargin: 100, // Assuming 100% margin for market sales
      roi: 0,
      efficiency: totalCustomers > 0 ? totalSales / totalCustomers : 0,
      sustainability: repeatCustomers / totalCustomers * 100 || 0
    };
  }

  private buildFarmToMarketMetrics(productionData: any, marketData: any, qualityData: any, cropCycles?: any[], harvests?: any[]): AnalyticsMetric[] {
    const totalCycles = productionData.totalCycles || 0;
    const completedCycles = productionData.completedCycles || 0;
    const totalYield = productionData.totalYield || 0;
    const totalOrders = marketData.totalOrders || 0;
    const totalSales = marketData.totalSales || 0;

    // Enhanced metrics using detailed crop cycle and harvest data
    const cropCyclesList = cropCycles || [];
    const harvestsList = harvests || [];
    
    // Calculate average cycle duration from detailed data
    const completedCropCycles = cropCyclesList.filter(cycle => cycle.status === 'COMPLETED');
    const avgCycleDuration = completedCropCycles.length > 0 
      ? completedCropCycles.reduce((sum, cycle) => {
          if (cycle.plantingDate && cycle.harvestDate) {
            const duration = (new Date(cycle.harvestDate).getTime() - new Date(cycle.plantingDate).getTime()) / (1000 * 60 * 60 * 24);
            return sum + duration;
          }
          return sum;
        }, 0) / completedCropCycles.length
      : 0;

    // Calculate harvest-to-sales traceability
    const harvestCount = harvestsList.length;
    const traceabilityRate = harvestCount > 0 && totalOrders > 0 ? Math.min(100, (totalOrders / harvestCount) * 100) : 0;

    const productionEfficiency = totalCycles > 0 ? (completedCycles / totalCycles) * 100 : 0;
    const marketConversion = totalYield > 0 ? (totalOrders / totalYield) * 100 : 0;
    const revenuePerYield = totalYield > 0 ? totalSales / totalYield : 0;

    return [
      {
        name: 'Production Efficiency',
        value: Math.round(productionEfficiency * 100) / 100,
        unit: '%',
        trend: productionEfficiency >= 80 ? 'up' : productionEfficiency >= 60 ? 'stable' : 'down'
      },
      {
        name: 'Farm-to-Market Traceability',
        value: Math.round(traceabilityRate * 100) / 100,
        unit: '%',
        trend: traceabilityRate >= 80 ? 'up' : traceabilityRate >= 60 ? 'stable' : 'down'
      },
      {
        name: 'Average Cycle Duration',
        value: Math.round(avgCycleDuration),
        unit: 'days',
        trend: avgCycleDuration <= 120 ? 'up' : avgCycleDuration <= 150 ? 'stable' : 'down'
      },
      {
        name: 'Market Conversion Rate',
        value: Math.round(marketConversion * 100) / 100,
        unit: '%',
        trend: marketConversion >= 50 ? 'up' : marketConversion >= 25 ? 'stable' : 'down'
      },
      {
        name: 'Revenue per Yield',
        value: Math.round(revenuePerYield * 100) / 100,
        unit: 'USD/unit',
        trend: revenuePerYield >= 100 ? 'up' : revenuePerYield >= 50 ? 'stable' : 'down'
      }
    ];
  }

  private buildFarmToMarketCharts(productionData: any, marketData: any, cropCycles?: any[], harvests?: any[]): AnalyticsChart[] {
    const cropCyclesList = cropCycles || [];
    const harvestsList = harvests || [];

    // Create harvest timeline chart using detailed harvest data
    const harvestTimelineData = harvestsList.slice(0, 10).map(harvest => ({
      label: harvest.cropCycle?.commodity?.name || 'Unknown',
      value: harvest.quantity || 0,
      timestamp: harvest.harvestDate || new Date().toISOString()
    }));

    // Create crop cycle status distribution
    const statusCounts = cropCyclesList.reduce((acc, cycle) => {
      acc[cycle.status] = (acc[cycle.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      label: status.replace('_', ' ').toLowerCase(),
      value: count,
      timestamp: new Date().toISOString()
    }));

    return [
      {
        type: 'bar',
        title: 'Crop Cycle Status Distribution',
        data: statusData.length > 0 ? statusData : [
          { label: 'Completed', value: productionData.completedCycles || 0, timestamp: new Date().toISOString() },
          { label: 'Active', value: (productionData.totalCycles || 0) - (productionData.completedCycles || 0), timestamp: new Date().toISOString() }
        ],
        xAxis: 'Status',
        yAxis: 'Count'
      },
      {
        type: 'line',
        title: 'Recent Harvest Timeline',
        data: harvestTimelineData.length > 0 ? harvestTimelineData : [
          { label: 'Total Yield', value: productionData.totalYield || 0, timestamp: new Date().toISOString() },
          { label: 'Total Sales', value: marketData.totalSales || 0, timestamp: new Date().toISOString() }
        ],
        xAxis: 'Time',
        yAxis: 'Quantity'
      }
    ];
  }

  private buildFarmToMarketSummary(productionData: any, marketData: any, cropCycles?: any[], harvests?: any[]): AnalyticsSummary {
    const totalYield = productionData.totalYield || 0;
    const totalSales = marketData.totalSales || 0;
    const completedCycles = productionData.completedCycles || 0;
    const totalCycles = productionData.totalCycles || 0;
    const cropCyclesList = cropCycles || [];
    const harvestsList = harvests || [];
    
    const productionEfficiency = totalCycles > 0 ? (completedCycles / totalCycles) * 100 : 0;
    const marketConversion = totalYield > 0 ? (marketData.totalOrders || 0) / totalYield * 100 : 0;
    
    // Calculate sustainability based on diverse crop cycles and harvest frequency
    const uniqueCommodities = new Set(cropCyclesList.map(cycle => cycle.commodity?.name).filter(Boolean)).size;
    const diversityScore = Math.min(100, uniqueCommodities * 20); // Max 5 commodities = 100%
    
    const recentHarvests = harvestsList.filter(harvest => {
      const harvestDate = new Date(harvest.harvestDate);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return harvestDate >= thirtyDaysAgo;
    }).length;
    
    const activityScore = Math.min(100, recentHarvests * 25); // Max 4 recent harvests = 100%
    const sustainabilityScore = (diversityScore + activityScore + marketConversion) / 3;
    
    return {
      totalRevenue: totalSales,
      totalCosts: 0, // Would need cost data for accurate calculation
      netProfit: totalSales,
      profitMargin: totalSales > 0 ? 100 : 0, // Assuming 100% margin for farm-to-market
      roi: 0,
      efficiency: productionEfficiency,
      sustainability: Math.round(sustainabilityScore)
    };
  }


  // =============================================================================
  // Validation and Error Handling Methods
  // =============================================================================

  private validateAnalyticsQuery(query: BaseAnalyticsQuery): void {
    if (!query) {
      throw new Error('Query parameters are required');
    }

    // Validate period
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    if (query.period && !validPeriods.includes(query.period)) {
      throw new Error(`Invalid period: ${query.period}. Must be one of: ${validPeriods.join(', ')}`);
    }

    // Validate farmId format if provided
    if (query.farmId && !this.isValidCUID(query.farmId)) {
      throw new Error('Invalid farmId format');
    }

    // Validate date range if provided (for extended queries)
    if ('startDate' in query && 'endDate' in query && query.startDate && query.endDate) {
      const start = new Date(query.startDate as string);
      const end = new Date(query.endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (start > end) {
        throw new Error('Start date must be before end date');
      }

      // Check if date range is not too large (max 2 years)
      const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
      if (end.getTime() - start.getTime() > maxRange) {
        throw new Error('Date range cannot exceed 2 years');
      }
    }
  }

  private isValidCUID(cuid: string): boolean {
    const cuidRegex = /^(c[a-z0-9]{24}|[a-z0-9]{24})$/i;
    return cuidRegex.test(cuid);
  }


  private async safeDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`Database operation failed: ${operationName}`, error);
      return fallbackValue;
    }
  }

  // =============================================================================
  // Sustainability Calculation Methods
  // =============================================================================

  private async calculateResourceEfficiency(whereClause: WhereClause): Promise<number> {
    try {
      // Remove organizationId from whereClause as FarmActivity doesn't have this field
      const activityWhere = { ...whereClause };
      delete activityWhere.organizationId;

      // Calculate resource efficiency based on input/output ratio and activity efficiency
      const [inputs, outputs, activities] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: TransactionType.FARM_EXPENSE },
          _sum: { amount: true }
        }),
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: TransactionType.FARM_REVENUE },
          _sum: { amount: true }
        }),
        this.prisma.farmActivity.count({
          where: { ...activityWhere, status: ActivityStatus.COMPLETED }
        })
      ]);

      const inputAmount = Number(inputs._sum.amount) || 0;
      const outputAmount = Number(outputs._sum.amount) || 0;

      if (inputAmount === 0) {
        // If no expenses but have revenue or completed activities, assume high efficiency
        return outputAmount > 0 || activities > 0 ? 85 : 50;
      }
      
      // Calculate basic ROI efficiency (0-100 scale)
      const roiEfficiency = Math.min(100, Math.max(0, (outputAmount / inputAmount) * 25)); // Scale to 0-100

      // Factor in activity completion rate as operational efficiency
      // Remove organizationId from whereClause as FarmActivity doesn't have this field
      const activityWhereForCount = { ...whereClause };
      delete activityWhereForCount.organizationId;
      const totalPlannedActivities = await this.prisma.farmActivity.count({ where: activityWhereForCount });
      const operationalEfficiency = totalPlannedActivities > 0 ? (activities / totalPlannedActivities) * 100 : 50;
      
      // Weighted combination of financial and operational efficiency
      const overallEfficiency = (roiEfficiency * 0.7) + (operationalEfficiency * 0.3);
      
      return Math.min(100, Math.max(0, overallEfficiency));
    } catch (error) {
      this.logger.warn('Failed to calculate resource efficiency:', error);
      return 50;
    }
  }

  private async calculateWasteReduction(whereClause: WhereClause): Promise<number> {
    try {
      // Remove organizationId from whereClause as FarmActivity doesn't have this field
      const activityWhere = { ...whereClause };
      delete activityWhere.organizationId;

      // Calculate waste reduction based on activity completion and resource utilization
      const [activities, costs] = await Promise.all([
        this.prisma.farmActivity.count({
          where: { ...activityWhere, status: ActivityStatus.COMPLETED }
        }),
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: TransactionType.FARM_EXPENSE },
          _sum: { amount: true }
        })
      ]);

      const totalActivities = await this.prisma.farmActivity.count({
        where: activityWhere
      });

      if (totalActivities === 0) return 50;

      const completionRate = (activities / totalActivities) * 100;
      const costEfficiency = costs._sum.amount ? Math.min(100, 100 - (Number(costs._sum.amount) / 1000)) : 50;

      return (completionRate + costEfficiency) / 2;
    } catch (error) {
      this.logger.warn('Failed to calculate waste reduction:', error);
      return 50;
    }
  }

  private async calculateEnvironmentalImpact(whereClause: WhereClause): Promise<number> {
    try {
      // Remove organizationId from whereClause as FarmActivity doesn't have this field
      const activityWhere = { ...whereClause };
      delete activityWhere.organizationId;

      // Calculate environmental impact based on sustainable practices
      const sustainableActivities = await this.prisma.farmActivity.count({
        where: {
          ...activityWhere,
          type: {
            in: [ActivityType.FERTILIZING, ActivityType.IRRIGATION, ActivityType.PEST_CONTROL]
          }
        }
      });

      const totalActivities = await this.prisma.farmActivity.count({
        where: activityWhere
      });

      if (totalActivities === 0) return 50;

      return (sustainableActivities / totalActivities) * 100;
    } catch (error) {
      this.logger.warn('Failed to calculate environmental impact:', error);
      return 50;
    }
  }

  /**
   * Get customer insights for farm-to-market integration
   */
  async getCustomerInsights(
    user: CurrentUser,
    query: CustomerInsightsQuery
  ): Promise<{
    data: {
      type: 'customer_insights';
      id: string;
      attributes: {
        customerOverview: {
          totalCustomers: number;
          repeatCustomers: number;
          newCustomers: number;
          averageOrderValue: number;
          customerRetentionRate: number;
          customerLifetimeValue: number;
        };
        customerSegments: Array<{
          segment: string;
          count: number;
          revenue: number;
          growth: number;
          characteristics: string[];
          averageOrderValue: number;
          retentionRate: number;
        }>;
        topCustomers: Array<{
          name: string;
          totalOrders: number;
          totalRevenue: number;
          lastOrder: string;
          averageOrderValue: number;
          customerSince: string;
          preferredCommodities: string[];
        }>;
        behaviorAnalysis: {
          purchasePatterns: Array<{
            pattern: string;
            frequency: number;
            description: string;
          }>;
          seasonalTrends: Array<{
            season: string;
            activity: 'high' | 'medium' | 'low';
            popularCommodities: string[];
          }>;
          priceSensitivity: 'low' | 'medium' | 'high';
          orderFrequency: {
            average: number;
            trend: 'increasing' | 'stable' | 'decreasing';
          };
        } | null;
        retentionMetrics: {
          monthlyRetention: number;
          quarterlyRetention: number;
          annualRetention: number;
          churnRate: number;
          reactivationRate: number;
        } | null;
        recommendations: Array<{
          category: 'retention' | 'acquisition' | 'upselling' | 'pricing';
          title: string;
          description: string;
          impact: 'low' | 'medium' | 'high';
          confidence: number;
          actionable: boolean;
          estimatedValue?: number;
        }>;
        lastUpdated: string;
      };
    };
  }> {
    this.logger.log(`Getting customer insights for user: ${user.userId}`);

    const {
      includeSegmentation = true,
      includeBehaviorAnalysis = true,
      includeRetentionMetrics = true
    } = query;

    try {
      // Get real customer data from orders
      const customerData = await this.getRealCustomerData(user.organizationId, query);
      
      // Calculate customer overview metrics
      const customerOverview = await this.calculateCustomerOverview(customerData);
      
      // Generate customer segments if requested
      const customerSegments = includeSegmentation ? 
        await this.generateCustomerSegments(customerData) : [];
      
      // Get top customers
      const topCustomers = await this.getTopCustomers(customerData);
      
      // Analyze behavior patterns if requested
      const behaviorAnalysis = includeBehaviorAnalysis ? 
        await this.analyzeCustomerBehavior(customerData) : null;
      
      // Calculate retention metrics if requested
      const retentionMetrics = includeRetentionMetrics ? 
        await this.calculateRetentionMetrics(customerData) : null;
      
      // Generate recommendations based on real data
      const recommendations = await this.generateCustomerRecommendations(customerOverview, customerSegments, behaviorAnalysis);

      return {
        data: {
          type: 'customer_insights' as const,
          id: `customer-insights-${Date.now()}`,
          attributes: {
            customerOverview,
            customerSegments,
            topCustomers,
            behaviorAnalysis,
            retentionMetrics,
            recommendations,
            lastUpdated: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      this.logger.error('Error getting customer insights:', error);
      // Return minimal data structure on error to prevent frontend crashes
      return {
        data: {
          type: 'customer_insights' as const,
          id: `customer-insights-${Date.now()}`,
          attributes: {
            customerOverview: {
              totalCustomers: 0,
              repeatCustomers: 0,
              newCustomers: 0,
              averageOrderValue: 0,
              customerRetentionRate: 0,
              customerLifetimeValue: 0
            },
            customerSegments: [],
            topCustomers: [],
            behaviorAnalysis: null,
            retentionMetrics: null,
            recommendations: [],
            lastUpdated: new Date().toISOString()
          }
        }
      };
    }
  }

  // =============================================================================
  // Customer Insights Helper Methods
  // =============================================================================

  /**
   * Get real customer data from orders and organizations
   */
  private async getRealCustomerData(organizationId: string, query: CustomerInsightsQuery) {
    const dateFilter = this.buildDateFilter(query.period || 'year');
    
    // Get orders from the organization (as supplier)
    const orders = await this.prisma.order.findMany({
      where: {
        supplierOrgId: organizationId,
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        buyerOrg: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        },
        items: {
          include: {
            commodity: {
              select: {
                name: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return orders;
  }

  /**
   * Calculate customer overview metrics from real data
   */
  private async calculateCustomerOverview(orders: any[]) {
    const uniqueCustomers = new Set(orders.map(order => order.buyerOrgId));
    const totalCustomers = uniqueCustomers.size;
    
    // Calculate repeat customers (customers with more than 1 order)
    const customerOrderCounts = orders.reduce((acc, order) => {
      acc[order.buyerOrgId] = (acc[order.buyerOrgId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const repeatCustomers = Object.values(customerOrderCounts).filter((count: number) => count > 1).length;
    const newCustomers = totalCustomers - repeatCustomers;
    
    // Calculate average order value
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    // Calculate customer lifetime value
    const customerLifetimeValues = Object.entries(customerOrderCounts).map(([customerId]) => {
      const customerOrders = orders.filter(order => order.buyerOrgId === customerId);
      const customerRevenue = customerOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
      return customerRevenue;
    });
    
    const averageLifetimeValue = customerLifetimeValues.length > 0 
      ? customerLifetimeValues.reduce((sum, value) => sum + value, 0) / customerLifetimeValues.length 
      : 0;
    
    // Calculate retention rate (simplified - customers who ordered in last 6 months vs previous 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const recentCustomers = new Set(
      orders
        .filter(order => order.createdAt >= sixMonthsAgo)
        .map(order => order.buyerOrgId)
    );
    
    const previousCustomers = new Set(
      orders
        .filter(order => order.createdAt >= twelveMonthsAgo && order.createdAt < sixMonthsAgo)
        .map(order => order.buyerOrgId)
    );
    
    const retainedCustomers = [...recentCustomers].filter(customerId => 
      previousCustomers.has(customerId)
    ).length;
    
    const customerRetentionRate = previousCustomers.size > 0 ? retainedCustomers / previousCustomers.size : 0;

    return {
      totalCustomers,
      repeatCustomers,
      newCustomers,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      customerRetentionRate: Math.round(customerRetentionRate * 100) / 100,
      customerLifetimeValue: Math.round(averageLifetimeValue * 100) / 100
    };
  }

  /**
   * Generate customer segments based on real data
   */
  private async generateCustomerSegments(orders: any[]) {
    const customerData = this.groupOrdersByCustomer(orders);
    
    const segments = [];
    
    // Premium Buyers (top 20% by revenue)
    const sortedByRevenue = Object.entries(customerData)
      .sort(([,a], [,b]) => b.totalRevenue - a.totalRevenue);
    const premiumCount = Math.max(1, Math.floor(sortedByRevenue.length * 0.2));
    const premiumCustomers = sortedByRevenue.slice(0, premiumCount);
    
    if (premiumCustomers.length > 0) {
      const premiumRevenue = premiumCustomers.reduce((sum, [,data]) => sum + data.totalRevenue, 0);
      const premiumAvgOrderValue = premiumRevenue / premiumCustomers.reduce((sum, [,data]) => sum + data.orderCount, 0);
      
      segments.push({
        segment: 'Premium Buyers',
        count: premiumCustomers.length,
        revenue: Math.round(premiumRevenue),
        growth: this.calculateGrowthRate(premiumCustomers),
        characteristics: ['High order value', 'Regular purchases', 'Quality focused'],
        averageOrderValue: Math.round(premiumAvgOrderValue * 100) / 100,
        retentionRate: this.calculateRetentionRate(premiumCustomers)
      });
    }
    
    // Regular Buyers (middle 60% by revenue)
    const regularStart = premiumCount;
    const regularEnd = Math.floor(sortedByRevenue.length * 0.8);
    const regularCustomers = sortedByRevenue.slice(regularStart, regularEnd);
    
    if (regularCustomers.length > 0) {
      const regularRevenue = regularCustomers.reduce((sum, [,data]) => sum + data.totalRevenue, 0);
      const regularAvgOrderValue = regularRevenue / regularCustomers.reduce((sum, [,data]) => sum + data.orderCount, 0);
      
      segments.push({
        segment: 'Regular Buyers',
        count: regularCustomers.length,
        revenue: Math.round(regularRevenue),
        growth: this.calculateGrowthRate(regularCustomers),
        characteristics: ['Consistent orders', 'Price sensitive', 'Bulk purchases'],
        averageOrderValue: Math.round(regularAvgOrderValue * 100) / 100,
        retentionRate: this.calculateRetentionRate(regularCustomers)
      });
    }
    
    // Occasional Buyers (bottom 20% by revenue)
    const occasionalCustomers = sortedByRevenue.slice(regularEnd);
    
    if (occasionalCustomers.length > 0) {
      const occasionalRevenue = occasionalCustomers.reduce((sum, [,data]) => sum + data.totalRevenue, 0);
      const occasionalAvgOrderValue = occasionalRevenue / occasionalCustomers.reduce((sum, [,data]) => sum + data.orderCount, 0);
      
      segments.push({
        segment: 'Occasional Buyers',
        count: occasionalCustomers.length,
        revenue: Math.round(occasionalRevenue),
        growth: this.calculateGrowthRate(occasionalCustomers),
        characteristics: ['Seasonal purchases', 'Price sensitive', 'Small orders'],
        averageOrderValue: Math.round(occasionalAvgOrderValue * 100) / 100,
        retentionRate: this.calculateRetentionRate(occasionalCustomers)
      });
    }
    
    return segments;
  }

  /**
   * Get top customers by revenue
   */
  private async getTopCustomers(orders: any[]) {
    const customerData = this.groupOrdersByCustomer(orders);
    
    return Object.entries(customerData)
      .sort(([,a], [,b]) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map(([customerId, data]) => {
        const customerOrders = orders.filter(order => order.buyerOrgId === customerId);
        const lastOrder = customerOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        const firstOrder = customerOrders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        
        // Get preferred commodities
        const commodityCounts = customerOrders.reduce((acc, order) => {
          order.items.forEach((item: any) => {
            const commodityName = item.commodity.name;
            acc[commodityName] = (acc[commodityName] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>);
        
        const preferredCommodities = Object.entries(commodityCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)
          .map(([commodity]) => commodity);
        
        return {
          name: data.organizationName,
          totalOrders: data.orderCount,
          totalRevenue: Math.round(data.totalRevenue),
          lastOrder: lastOrder?.createdAt.toISOString() || new Date().toISOString(),
          averageOrderValue: Math.round((data.totalRevenue / data.orderCount) * 100) / 100,
          customerSince: firstOrder?.createdAt.toISOString() || new Date().toISOString(),
          preferredCommodities
        };
      });
  }

  /**
   * Analyze customer behavior patterns
   */
  private async analyzeCustomerBehavior(orders: any[]) {
    const customerData = this.groupOrdersByCustomer(orders);
    
    // Analyze purchase patterns
    const orderFrequencies = Object.values(customerData).map(data => data.orderCount);
    const avgOrderFrequency = orderFrequencies.length > 0 
      ? orderFrequencies.reduce((sum, freq) => sum + freq, 0) / orderFrequencies.length 
      : 0;
    
    // Determine frequency trend (simplified)
    const recentOrders = orders.filter(order => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return order.createdAt >= sixMonthsAgo;
    });
    
    const recentFrequency = recentOrders.length / 6; // orders per month
    const trend = recentFrequency > avgOrderFrequency ? 'increasing' : 
                  recentFrequency < avgOrderFrequency * 0.8 ? 'decreasing' : 'stable';
    
    // Analyze seasonal trends
    const seasonalData = this.analyzeSeasonalTrends(orders);
    
    // Determine price sensitivity (simplified based on order value variance)
    const priceSensitivity = this.calculatePriceSensitivity(customerData);
    
    return {
      purchasePatterns: [
        {
          pattern: 'Regular Orders',
          frequency: Math.min(1, avgOrderFrequency / 12), // Normalize to 0-1
          description: 'Consistent monthly purchases'
        },
        {
          pattern: 'Bulk Orders',
          frequency: Math.min(1, this.calculateBulkOrderFrequency(orders)),
          description: 'Large quantity purchases'
        },
        {
          pattern: 'Seasonal Orders',
          frequency: Math.min(1, this.calculateSeasonalOrderFrequency(orders)),
          description: 'Time-specific purchases'
        }
      ],
      seasonalTrends: seasonalData,
      priceSensitivity,
      orderFrequency: {
        average: Math.round(avgOrderFrequency * 100) / 100,
        trend: trend as 'increasing' | 'stable' | 'decreasing'
      }
    };
  }

  /**
   * Calculate retention metrics
   */
  private async calculateRetentionMetrics(orders: any[]) {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    // Get customers who ordered in previous periods
    const previousMonthCustomers = new Set(
      orders
        .filter(order => order.createdAt >= threeMonthsAgo && order.createdAt < oneMonthAgo)
        .map(order => order.buyerOrgId)
    );
    
    const previousQuarterCustomers = new Set(
      orders
        .filter(order => order.createdAt >= new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000) && order.createdAt < threeMonthsAgo)
        .map(order => order.buyerOrgId)
    );
    
    const previousYearCustomers = new Set(
      orders
        .filter(order => order.createdAt >= new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000) && order.createdAt < oneYearAgo)
        .map(order => order.buyerOrgId)
    );
    
    // Get customers who ordered in current periods
    const currentMonthCustomers = new Set(
      orders
        .filter(order => order.createdAt >= oneMonthAgo)
        .map(order => order.buyerOrgId)
    );
    
    const currentQuarterCustomers = new Set(
      orders
        .filter(order => order.createdAt >= threeMonthsAgo)
        .map(order => order.buyerOrgId)
    );
    
    const currentYearCustomers = new Set(
      orders
        .filter(order => order.createdAt >= oneYearAgo)
        .map(order => order.buyerOrgId)
    );
    
    // Calculate retention rates
    const monthlyRetention = previousMonthCustomers.size > 0 
      ? [...currentMonthCustomers].filter(id => previousMonthCustomers.has(id)).length / previousMonthCustomers.size 
      : 0;
    
    const quarterlyRetention = previousQuarterCustomers.size > 0 
      ? [...currentQuarterCustomers].filter(id => previousQuarterCustomers.has(id)).length / previousQuarterCustomers.size 
      : 0;
    
    const annualRetention = previousYearCustomers.size > 0 
      ? [...currentYearCustomers].filter(id => previousYearCustomers.has(id)).length / previousYearCustomers.size 
      : 0;
    
    const churnRate = 1 - monthlyRetention;
    const reactivationRate = this.calculateReactivationRate(orders);
    
    return {
      monthlyRetention: Math.round(monthlyRetention * 100) / 100,
      quarterlyRetention: Math.round(quarterlyRetention * 100) / 100,
      annualRetention: Math.round(annualRetention * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      reactivationRate: Math.round(reactivationRate * 100) / 100
    };
  }

  /**
   * Generate customer recommendations based on real data
   */
  private async generateCustomerRecommendations(
    customerOverview: any, 
    customerSegments: any[], 
    behaviorAnalysis: any
  ) {
    const recommendations = [];
    
    // Retention recommendations
    if (customerOverview.customerRetentionRate < 0.7) {
      recommendations.push({
        category: 'retention' as const,
        title: 'Improve Customer Retention',
        description: `Current retention rate is ${(customerOverview.customerRetentionRate * 100).toFixed(1)}%. Implement loyalty programs and improve customer service.`,
        impact: 'high' as const,
        confidence: 0.85,
        actionable: true,
        estimatedValue: Math.round(customerOverview.averageOrderValue * customerOverview.totalCustomers * 0.1)
      });
    }
    
    // Acquisition recommendations
    const occasionalBuyers = customerSegments.find(s => s.segment === 'Occasional Buyers');
    if (occasionalBuyers && occasionalBuyers.count > 0) {
      recommendations.push({
        category: 'acquisition' as const,
        title: 'Convert Occasional Buyers',
        description: `Target ${occasionalBuyers.count} occasional buyers with personalized offers to increase their order frequency.`,
        impact: 'medium' as const,
        confidence: 0.72,
        actionable: true,
        estimatedValue: Math.round(occasionalBuyers.averageOrderValue * occasionalBuyers.count * 0.3)
      });
    }
    
    // Upselling recommendations
    const regularBuyers = customerSegments.find(s => s.segment === 'Regular Buyers');
    if (regularBuyers && regularBuyers.averageOrderValue < 5000) {
      recommendations.push({
        category: 'upselling' as const,
        title: 'Increase Average Order Value',
        description: `Regular buyers have an average order value of $${regularBuyers.averageOrderValue}. Offer premium products and bulk discounts.`,
        impact: 'medium' as const,
        confidence: 0.68,
        actionable: true,
        estimatedValue: Math.round(regularBuyers.averageOrderValue * regularBuyers.count * 0.2)
      });
    }
    
    // Pricing recommendations
    if (behaviorAnalysis?.priceSensitivity === 'high') {
      recommendations.push({
        category: 'pricing' as const,
        title: 'Implement Dynamic Pricing',
        description: 'Customers show high price sensitivity. Consider dynamic pricing strategies and value-based pricing.',
        impact: 'high' as const,
        confidence: 0.78,
        actionable: true,
        estimatedValue: Math.round(customerOverview.averageOrderValue * customerOverview.totalCustomers * 0.15)
      });
    }
    
    return recommendations;
  }

  // =============================================================================
  // Helper Methods for Customer Analysis
  // =============================================================================

  /**
   * Group orders by customer for analysis
   */
  private groupOrdersByCustomer(orders: any[]) {
    const customerData: Record<string, any> = {};
    
    orders.forEach(order => {
      const customerId = order.buyerOrgId;
      if (!customerData[customerId]) {
        customerData[customerId] = {
          organizationName: order.buyerOrg.name,
          orderCount: 0,
          totalRevenue: 0,
          orders: []
        };
      }
      
      customerData[customerId].orderCount++;
      customerData[customerId].totalRevenue += Number(order.totalPrice || 0);
      customerData[customerId].orders.push(order);
    });
    
    return customerData;
  }

  /**
   * Calculate growth rate for customer segments
   */
  private calculateGrowthRate(customers: [string, any][]) {
    // Simplified growth calculation based on recent vs older orders
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    
    let recentRevenue = 0;
    let olderRevenue = 0;
    
    customers.forEach(([, data]) => {
      data.orders.forEach((order: any) => {
        if (order.createdAt >= sixMonthsAgo) {
          recentRevenue += Number(order.totalPrice || 0);
        } else {
          olderRevenue += Number(order.totalPrice || 0);
        }
      });
    });
    
    if (olderRevenue === 0) return recentRevenue > 0 ? 100 : 0;
    return Math.round(((recentRevenue - olderRevenue) / olderRevenue) * 100 * 100) / 100;
  }

  /**
   * Calculate retention rate for customer segments
   */
  private calculateRetentionRate(customers: [string, any][]) {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    let activeCustomers = 0;
    customers.forEach(([, data]) => {
      const hasRecentOrder = data.orders.some((order: any) => order.createdAt >= threeMonthsAgo);
      if (hasRecentOrder) activeCustomers++;
    });
    
    return customers.length > 0 ? Math.round((activeCustomers / customers.length) * 100) / 100 : 0;
  }

  /**
   * Analyze seasonal trends in orders
   */
  private analyzeSeasonalTrends(orders: any[]) {
    const seasonalData: Record<string, { count: number; commodities: Set<string> }> = {};
    
    orders.forEach(order => {
      const month = order.createdAt.getMonth();
      let season = 'Winter';
      if (month >= 2 && month <= 4) season = 'Spring';
      else if (month >= 5 && month <= 7) season = 'Summer';
      else if (month >= 8 && month <= 10) season = 'Fall';
      
      if (!seasonalData[season]) {
        seasonalData[season] = { count: 0, commodities: new Set() };
      }
      
      seasonalData[season].count++;
      order.items.forEach((item: any) => {
        seasonalData[season].commodities.add(item.commodity.name);
      });
    });
    
    return Object.entries(seasonalData).map(([season, data]) => {
      const totalOrders = orders.length;
      const activityLevel = data.count / totalOrders;
      let activity: 'high' | 'medium' | 'low' = 'low';
      if (activityLevel > 0.3) activity = 'high';
      else if (activityLevel > 0.15) activity = 'medium';
      
      return {
        season,
        activity,
        popularCommodities: Array.from(data.commodities).slice(0, 3)
      };
    });
  }

  /**
   * Calculate price sensitivity based on order value variance
   */
  private calculatePriceSensitivity(customerData: Record<string, any>): 'low' | 'medium' | 'high' {
    const orderValues = Object.values(customerData).flatMap((data: any) => 
      data.orders.map((order: any) => Number(order.totalPrice || 0))
    );
    
    if (orderValues.length < 2) return 'medium';
    
    const mean = orderValues.reduce((sum, value) => sum + value, 0) / orderValues.length;
    const variance = orderValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / orderValues.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    if (coefficientOfVariation > 0.5) return 'high';
    if (coefficientOfVariation > 0.2) return 'medium';
    return 'low';
  }

  /**
   * Calculate bulk order frequency
   */
  private calculateBulkOrderFrequency(orders: any[]) {
    const bulkThreshold = 10000; // $10,000+ orders
    const bulkOrders = orders.filter(order => Number(order.totalPrice || 0) >= bulkThreshold);
    return bulkOrders.length / orders.length;
  }

  /**
   * Calculate seasonal order frequency
   */
  private calculateSeasonalOrderFrequency(orders: any[]) {
    // Simplified: orders that happen in specific months
    const seasonalMonths = [2, 3, 4, 8, 9, 10]; // Spring and Fall
    const seasonalOrders = orders.filter(order => seasonalMonths.includes(order.createdAt.getMonth()));
    return seasonalOrders.length / orders.length;
  }

  /**
   * Calculate reactivation rate
   */
  private calculateReactivationRate(orders: any[]) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    // Customers who were inactive (no orders) for 6+ months but came back
    const inactiveCustomers = new Set(
      orders
        .filter(order => order.createdAt < sixMonthsAgo)
        .map(order => order.buyerOrgId)
    );
    
    const reactivatedCustomers = new Set(
      orders
        .filter(order => order.createdAt >= sixMonthsAgo && order.createdAt < twelveMonthsAgo)
        .map(order => order.buyerOrgId)
    );
    
    const reactivated = [...reactivatedCustomers].filter(id => inactiveCustomers.has(id)).length;
    return inactiveCustomers.size > 0 ? reactivated / inactiveCustomers.size : 0;
  }
}
