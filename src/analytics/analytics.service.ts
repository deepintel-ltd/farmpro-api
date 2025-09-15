import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { JobQueueService } from '../common/services/job-queue.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
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
  AnalyticsSummary
} from '@contracts/analytics.contract';
import { 
  DateFilter, 
  WhereClause
} from './types/analytics.types';
import { TransactionType, ActivityType, CropStatus, ActivityStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly intelligenceService: IntelligenceService,
    private readonly jobQueueService: JobQueueService,
  ) {}

  /**
   * Get dashboard analytics with key performance indicators
   */
  async getDashboard(user: CurrentUser, query: BaseAnalyticsQuery): Promise<AnalyticsResponse> {
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
          return cached;
        }
      }

      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = this.buildWhereClause(user, query, dateFilter);

      // Fetch key metrics in parallel
      const [revenue, expenses, activities] = await Promise.all([
        this.getRevenueData(whereClause),
        this.getExpenseData(whereClause),
        this.getActivityCount(whereClause)
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
            insights: query.includeInsights ? await this.generateInsights(user, query) : undefined,
            summary,
            generatedAt: new Date().toISOString(),
            cacheKey: query.useCache ? cacheKey : undefined
          }
        }
      };

      // Cache the response
      if (query.useCache) {
        await this.cacheService.set(cacheKey, response, 300); // 5 minutes
      }

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
      where: whereClause
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
      const activityWhere = {
        ...whereClause,
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
      const [activities, revenue] = await Promise.all([
        this.prisma.farmActivity.count({ where: whereClause }),
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
      const [totalCosts, activityCount] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: TransactionType.FARM_EXPENSE },
          _sum: { amount: true }
        }),
        this.prisma.farmActivity.count({ where: whereClause })
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
    const costPerActivity = costs.avgCostPerActivity || 0;

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
        value: Math.round((efficiency.efficiency || 0) * 100) / 100,
        unit: 'USD/activity',
        trend: efficiency.efficiency >= 1000 ? 'up' : efficiency.efficiency >= 500 ? 'stable' : 'down'
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
          { label: 'Efficiency', value: efficiency.efficiency || 0, timestamp: new Date().toISOString() },
          { label: 'Utilization', value: efficiency.resourceUtilization || 0, timestamp: new Date().toISOString() }
        ],
        xAxis: 'Metric',
        yAxis: 'Value'
      }
    ];
  }

  private buildActivitySummary(activities: any, costs: any): AnalyticsSummary {
    const completionRate = activities.totalActivities > 0 ? (activities.completedActivities / activities.totalActivities) * 100 : 0;
    const totalCosts = costs.totalCosts || 0;
    
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
    const repeatCustomers = customerData.repeatCustomers || 0;
    const totalCustomers = customerData.totalCustomers || 0;
    const avgPrice = pricingData.avgPrice || 0;

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
        trend: pricingData.priceTrend || 'stable'
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
    if (query.farmId && !this.isValidUUID(query.farmId)) {
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

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
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
          where: { ...whereClause, status: ActivityStatus.COMPLETED }
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
      const totalPlannedActivities = await this.prisma.farmActivity.count({ where: whereClause });
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
      // Calculate waste reduction based on activity completion and resource utilization
      const [activities, costs] = await Promise.all([
        this.prisma.farmActivity.count({
          where: { ...whereClause, status: ActivityStatus.COMPLETED }
        }),
        this.prisma.transaction.aggregate({
          where: { ...whereClause, type: TransactionType.FARM_EXPENSE },
          _sum: { amount: true }
        })
      ]);

      const totalActivities = await this.prisma.farmActivity.count({
        where: whereClause
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
      // Calculate environmental impact based on sustainable practices
      const sustainableActivities = await this.prisma.farmActivity.count({
        where: {
          ...whereClause,
          type: {
            in: [ActivityType.FERTILIZING, ActivityType.IRRIGATION, ActivityType.PEST_CONTROL]
          }
        }
      });

      const totalActivities = await this.prisma.farmActivity.count({
        where: whereClause
      });

      if (totalActivities === 0) return 50;

      return (sustainableActivities / totalActivities) * 100;
    } catch (error) {
      this.logger.warn('Failed to calculate environmental impact:', error);
      return 50;
    }
  }
}
