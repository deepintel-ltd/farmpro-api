import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  BaseAnalyticsQuery,
  FinancialQuery,
  ActivityQuery,
  MarketQuery,
  ExportRequest,
  AnalyticsResponse
} from '../../contracts/analytics.contract';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard analytics with key performance indicators
   */
  async getDashboard(user: CurrentUser, query: BaseAnalyticsQuery): Promise<AnalyticsResponse> {
    this.logger.log(`Getting dashboard analytics for user: ${user.userId}`);

    try {
      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = {
        organizationId: user.organizationId,
        ...(query.farmId && { farmId: query.farmId }),
        ...(dateFilter && { createdAt: dateFilter })
      };

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

      return {
        data: {
          type: 'analytics_dashboard',
          id: 'dashboard',
          attributes: {
            period: query.period || 'month',
            farmId: query.farmId,
            metrics: [
              {
                name: 'Total Revenue',
                value: revenueAmount,
                unit: 'USD',
                trend: 'stable'
              },
              {
                name: 'Total Expenses',
                value: expenseAmount,
                unit: 'USD',
                trend: 'stable'
              },
              {
                name: 'Net Profit',
                value: netProfit,
                unit: 'USD',
                trend: netProfit > 0 ? 'up' : netProfit < 0 ? 'down' : 'stable'
              },
              {
                name: 'Active Activities',
                value: activities,
                unit: 'count',
                trend: 'stable'
              }
            ],
            charts: [
              {
                type: 'bar' as const,
                title: 'Revenue vs Expenses',
                data: [
                  { label: 'Revenue', value: revenueAmount },
                  { label: 'Expenses', value: expenseAmount }
                ],
                xAxis: 'Category',
                yAxis: 'Amount (USD)'
              }
            ],
            summary: {
              totalRevenue: revenueAmount,
              totalCosts: expenseAmount,
              netProfit,
              profitMargin
            },
            generatedAt: new Date().toISOString()
          }
        }
      };
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

    try {
      const dateFilter = this.buildDateFilter(query.period);
      const whereClause = {
        organizationId: user.organizationId,
        ...(query.farmId && { farmId: query.farmId }),
        ...(dateFilter && { createdAt: dateFilter })
      };

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

      return {
        data: {
          type: 'analytics_financial',
          id: 'financial',
          attributes: {
            period: query.period || 'month',
            farmId: query.farmId,
            metrics: [
              {
                name: 'Total Revenue',
                value: revenueAmount,
                unit: 'USD',
                trend: 'stable'
              },
              {
                name: 'Total Expenses',
                value: expenseAmount,
                unit: 'USD',
                trend: 'stable'
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
            ],
            charts: [
              {
                type: 'pie' as const,
                title: 'Revenue vs Expenses',
                data: [
                  { label: 'Revenue', value: revenueAmount },
                  { label: 'Expenses', value: expenseAmount }
                ],
                xAxis: 'Category',
                yAxis: 'Amount'
              }
            ],
            summary: {
              totalRevenue: revenueAmount,
              totalCosts: expenseAmount,
              netProfit,
              profitMargin
            },
            generatedAt: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      this.logger.error(`Financial analytics failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve financial analytics');
    }
  }

  /**
   * Get farm-to-market journey analytics
   */
  async getFarmToMarketAnalytics(user: CurrentUser, query: MarketQuery): Promise<AnalyticsResponse> {
    this.logger.log(`Getting farm-to-market analytics for user: ${user.userId}`);

    try {
      // This will be implemented based on actual farm-to-market data flow
      return {
        data: {
          type: 'analytics_farm_to_market',
          id: 'farm-to-market',
          attributes: {
            period: query.period || 'month',
            farmId: query.farmId,
            metrics: [
              {
                name: 'Production Efficiency',
                value: 85,
                unit: '%',
                trend: 'up'
              }
            ],
            charts: [],
            summary: {
              totalRevenue: 0,
              totalCosts: 0,
              netProfit: 0,
              profitMargin: 0
            },
            generatedAt: new Date().toISOString()
          }
        }
      };
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
      // This will be implemented based on actual activity data
      return {
        data: {
          type: 'analytics_activities',
          id: 'activities',
          attributes: {
            period: query.period || 'month',
            farmId: query.farmId,
            metrics: [
              {
                name: 'Activity Completion Rate',
                value: 92,
                unit: '%',
                trend: 'up'
              }
            ],
            charts: [],
            summary: {
              totalRevenue: 0,
              totalCosts: 0,
              netProfit: 0,
              profitMargin: 0
            },
            generatedAt: new Date().toISOString()
          }
        }
      };
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
      // This will be implemented based on actual market data
      return {
        data: {
          type: 'analytics_market',
          id: 'market',
          attributes: {
            period: query.period || 'month',
            farmId: query.farmId,
            metrics: [
              {
                name: 'Market Performance',
                value: 78,
                unit: '%',
                trend: 'stable'
              }
            ],
            charts: [],
            summary: {
              totalRevenue: 0,
              totalCosts: 0,
              netProfit: 0,
              profitMargin: 0
            },
            generatedAt: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      this.logger.error(`Market analytics failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to retrieve market analytics');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(user: CurrentUser, request: ExportRequest): Promise<any> {
    this.logger.log(`Exporting ${request.type} analytics for user: ${user.userId}`);

    try {
      const exportId = this.generateUUID();
      
      // In a real implementation, this would trigger background job based on request.type and request.format
      return {
        data: {
          type: 'analytics_export',
          id: exportId,
          attributes: {
            status: 'processing',
            downloadUrl: `/api/analytics/exports/${exportId}/download`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          }
        }
      };
    } catch (error) {
      this.logger.error(`Export failed for user ${user.userId}:`, error);
      throw new InternalServerErrorException('Failed to export analytics');
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

  private async getRevenueData(whereClause: any) {
    return this.prisma.transaction.aggregate({
      where: { ...whereClause, type: 'FARM_REVENUE' },
      _sum: { amount: true },
      _count: { id: true }
    });
  }

  private async getExpenseData(whereClause: any) {
    return this.prisma.transaction.aggregate({
      where: { ...whereClause, type: 'FARM_EXPENSE' },
      _sum: { amount: true },
      _count: { id: true }
    });
  }

  private async getActivityCount(whereClause: any) {
    const result = await this.prisma.farmActivity.count({
      where: whereClause
    });
    return result;
  }

  private async getOrderData(organizationId: string, dateFilter: any) {
    return this.prisma.order.findMany({
      where: {
        buyerOrgId: organizationId,
        ...(dateFilter && { createdAt: dateFilter })
      },
      take: 100
    });
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
