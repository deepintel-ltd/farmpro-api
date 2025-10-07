import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { CurrencyAwareService } from '../common/services/currency-aware.service';
import { CurrencyService } from '../common/services/currency.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  ExecutiveDashboardQuerySchema,
  FinancialHealthQuerySchema,
  RiskIndicatorsQuerySchema,
  CashFlowQuerySchema,
  PendingActionsQuerySchema,
  ExecutiveInsightsQuerySchema,
} from '@contracts/executive-dashboard.contract';
import { z } from 'zod';
import { TransactionType, TransactionStatus, Currency } from '@prisma/client';

// Type definitions are now inferred directly from schemas

@Injectable()
export class ExecutiveDashboardService extends CurrencyAwareService {
  private readonly logger = new Logger(ExecutiveDashboardService.name);

  constructor(
    prisma: PrismaService,
    private readonly cacheService: CacheService,
    currencyService: CurrencyService,
  ) {
    super(prisma, currencyService);
  }

  /**
   * Get comprehensive executive dashboard overview
   */
  async getExecutiveDashboard(user: CurrentUser, query: z.infer<typeof ExecutiveDashboardQuerySchema>) {
    const startTime = Date.now();
    this.logger.log(`Getting executive dashboard for user: ${user.userId}`);

    const cacheKey = `executive-dashboard-${user.organizationId}-${query.period}-${query.currency}`;
    
    if (query.useCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for executive dashboard: ${Date.now() - startTime}ms`);
        return cached;
      }
    }

    try {
      const [
        financialHealth,
        riskIndicators,
        cashFlow,
        keyMetrics,
        pendingActions,
        insights,
      ] = await Promise.all([
        this.calculateFinancialHealth(user, {
          period: query.period,
          currency: query.currency,
          includeBreakdown: true,
          useCache: query.useCache,
        }),
        this.calculateRiskIndicators(user, {
          currency: query.currency,
          includeAlerts: true,
          useCache: query.useCache,
        }),
        this.calculateCashFlowAnalysis(user, {
          period: query.period,
          currency: query.currency,
          includeProjections: query.includeProjections,
          projectionMonths: 6,
          useCache: query.useCache,
        }),
        this.calculateKeyMetrics(user.userId, query.period, query.currency),
        this.getPendingActions(user, {
          limit: 10,
          useCache: query.useCache,
        }),
        query.includeInsights ? this.getExecutiveInsights(user, {
          limit: 10,
          useCache: query.useCache,
        }) : [],
      ]);

      const result = {
        financialHealth,
        riskIndicators,
        cashFlow,
        keyMetrics,
        pendingActions,
        insights,
        lastUpdated: new Date().toISOString(),
      };

      if (query.useCache) {
        await this.cacheService.set(cacheKey, result, 300); // 5 minutes
      }

      this.logger.log(`Executive dashboard retrieved in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting executive dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate financial health score
   */
  async calculateFinancialHealth(user: CurrentUser, query: z.infer<typeof FinancialHealthQuerySchema>) {
    const startTime = Date.now();
    this.logger.log(`Calculating financial health for user: ${user.userId}`);

    const cacheKey = `financial-health-${user.organizationId}-${query.period}-${query.currency}`;
    
    if (query.useCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for financial health: ${Date.now() - startTime}ms`);
        return cached;
      }
    }

    try {
      const transactions = await this.getTransactionsByPeriod(
        user.organizationId, 
        query.period,
        query.currency
      );
      
      // Calculate health factors
      const cashFlowScore = this.calculateCashFlowScore(transactions, query.currency);
      const profitabilityScore = this.calculateProfitabilityScore(transactions, query.currency);
      const growthScore = this.calculateGrowthScore(transactions, query.currency);
      const efficiencyScore = this.calculateEfficiencyScore(transactions, query.currency);
      
      // Calculate overall score
      const overallScore = (cashFlowScore + profitabilityScore + growthScore + efficiencyScore) / 4;
      
      const result = {
        score: Math.round(overallScore),
        trend: this.calculateTrend(transactions, query.currency),
        factors: {
          cashFlow: cashFlowScore,
          profitability: profitabilityScore,
          growth: growthScore,
          efficiency: efficiencyScore,
        },
        grade: this.getGrade(overallScore),
        recommendations: this.generateRecommendations(overallScore),
        lastCalculated: new Date().toISOString(),
      };

      if (query.useCache) {
        await this.cacheService.set(cacheKey, result, 600); // 10 minutes
      }

      this.logger.log(`Financial health calculated in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Error calculating financial health: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate risk indicators
   */
  async calculateRiskIndicators(user: CurrentUser, query: z.infer<typeof RiskIndicatorsQuerySchema>) {
    const startTime = Date.now();
    this.logger.log(`Calculating risk indicators for user: ${user.userId}`);

    const cacheKey = `risk-indicators-${user.organizationId}-${query.currency}`;
    
    if (query.useCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for risk indicators: ${Date.now() - startTime}ms`);
        return cached;
      }
    }

    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { 
          organizationId: user.organizationId,
          currency: query.currency as Currency,
        },
        orderBy: { createdAt: 'desc' },
      });

      const orders = await this.prisma.order.findMany({
        where: { 
          OR: [
            { buyerOrgId: user.organizationId },
            { supplierOrgId: user.organizationId }
          ]
        },
        orderBy: { createdAt: 'desc' },
      });
      
      // Calculate risk factors
      const overduePayments = this.calculateOverduePayments(transactions, query.currency);
      const budgetVariance = this.calculateBudgetVariance(transactions, query.currency);
      const cashFlowRisk = this.assessCashFlowRisk(transactions, query.currency);
      const marketRisk = this.assessMarketRisk(orders);
      const operationalRisk = this.assessOperationalRisk();
      
      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk({
        overduePayments,
        budgetVariance,
        cashFlowRisk,
        marketRisk,
        operationalRisk,
      });
      
      const result = {
        overallRisk,
        riskTrend: this.calculateRiskTrend(transactions),
        indicators: {
          overduePayments,
          budgetVariance,
          cashFlowRisk,
          marketRisk,
          operationalRisk,
        },
        alerts: query.includeAlerts ? await this.generateRiskAlerts(user.organizationId, query.currency) : [],
        lastCalculated: new Date().toISOString(),
      };

      if (query.useCache) {
        await this.cacheService.set(cacheKey, result, 600); // 10 minutes
      }

      this.logger.log(`Risk indicators calculated in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Error calculating risk indicators: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate cash flow analysis
   */
  async calculateCashFlowAnalysis(user: CurrentUser, query: z.infer<typeof CashFlowQuerySchema>) {
    const startTime = Date.now();
    this.logger.log(`Calculating cash flow analysis for user: ${user.userId}`);

    const cacheKey = `cash-flow-${user.organizationId}-${query.period}-${query.currency}`;
    
    if (query.useCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for cash flow analysis: ${Date.now() - startTime}ms`);
        return cached;
      }
    }

    try {
      const transactions = await this.getTransactionsByPeriod(
        user.organizationId, 
        query.period,
        query.currency
      );
      
      // Calculate cash flow components
      const operatingCashFlow = this.calculateOperatingCashFlow(transactions, query.currency);
      const investingCashFlow = this.calculateInvestingCashFlow(transactions, query.currency);
      const financingCashFlow = this.calculateFinancingCashFlow(transactions, query.currency);
      
      const currentCashFlow = {
        amount: operatingCashFlow.amount + investingCashFlow.amount + financingCashFlow.amount,
        currency: query.currency,
      };
      
      const projectedCashFlow = query.includeProjections 
        ? this.projectCashFlow(transactions, query.currency, query.projectionMonths)
        : { amount: 0, currency: query.currency };
      
      const result = {
        currentCashFlow,
        projectedCashFlow,
        trend: this.calculateCashFlowTrend(transactions, query.currency),
        breakdown: {
          operating: operatingCashFlow,
          investing: investingCashFlow,
          financing: financingCashFlow,
        },
        burnRate: this.calculateBurnRate(transactions, query.currency),
        runway: this.calculateRunway(transactions, query.currency),
        lastCalculated: new Date().toISOString(),
      };

      if (query.useCache) {
        await this.cacheService.set(cacheKey, result, 600); // 10 minutes
      }

      this.logger.log(`Cash flow analysis calculated in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Error calculating cash flow analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pending executive actions
   */
  async getPendingActions(user: CurrentUser, query: z.infer<typeof PendingActionsQuerySchema>) {
    const startTime = Date.now();
    this.logger.log(`Getting pending actions for user: ${user.userId}`);

    const cacheKey = `pending-actions-${user.organizationId}-${query.limit}`;
    
    if (query.useCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for pending actions: ${Date.now() - startTime}ms`);
        return cached;
      }
    }

    try {
      // Get pending transaction approvals
      const pendingTransactions = await this.prisma.transaction.findMany({
        where: {
          organizationId: user.organizationId,
          requiresApproval: true,
          status: TransactionStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        include: {
          createdBy: {
            select: { name: true, email: true }
          }
        }
      });

      const actions = pendingTransactions.map((transaction) => ({
        id: transaction.id,
        type: 'approval' as const,
        title: `Transaction Approval Required`,
        description: transaction.description,
        priority: this.determinePriority(Number(transaction.amount), transaction.dueDate),
        dueDate: transaction.dueDate?.toISOString(),
        assignedTo: transaction.createdBy?.name || 'Unknown',
        createdAt: transaction.createdAt.toISOString(),
      }));

      const result = actions.slice(0, query.limit);

      if (query.useCache) {
        await this.cacheService.set(cacheKey, result, 300); // 5 minutes
      }

      this.logger.log(`Pending actions retrieved in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting pending actions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get executive insights
   */
  async getExecutiveInsights(user: CurrentUser, query: z.infer<typeof ExecutiveInsightsQuerySchema>) {
    const startTime = Date.now();
    this.logger.log(`Getting executive insights for user: ${user.userId}`);

    const cacheKey = `executive-insights-${user.organizationId}-${query.limit}`;
    
    if (query.useCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for executive insights: ${Date.now() - startTime}ms`);
        return cached;
      }
    }

    try {
      // Generate insights based on current data
      const insights = await this.generateInsights(user.organizationId);
      
      const result = insights.slice(0, query.limit);

      if (query.useCache) {
        await this.cacheService.set(cacheKey, result, 1800); // 30 minutes
      }

      this.logger.log(`Executive insights retrieved in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting executive insights: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper methods for calculations
  private async getTransactionsByPeriod(organizationId: string, period: string, currency: any) {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    return this.prisma.transaction.findMany({
      where: {
        organizationId,
        currency,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private calculateCashFlowScore(transactions: any[], currency: string): number {
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    
    if (revenue === 0) return 0;
    
    const cashFlowRatio = (revenue - expenses) / revenue;
    return Math.min(100, Math.max(0, cashFlowRatio * 100));
  }

  private calculateProfitabilityScore(transactions: any[], currency: string): number {
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    
    if (revenue === 0) return 0;
    
    const profitMargin = (revenue - expenses) / revenue;
    return Math.min(100, Math.max(0, profitMargin * 100));
  }

  private calculateGrowthScore(transactions: any[], currency: string): number {
    // Compare current period with previous period
    // This is a simplified calculation - in production, you'd compare actual periods
    const currentRevenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const currentExpenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    
    if (currentExpenses === 0) return 100;
    
    const growthRatio = (currentRevenue - currentExpenses) / currentExpenses;
    return Math.min(100, Math.max(0, 50 + (growthRatio * 25))); // Base score of 50, adjust by growth
  }

  private calculateEfficiencyScore(transactions: any[], currency: string): number {
    // Calculate efficiency based on transaction patterns
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    
    if (revenue === 0) return 0;
    
    const efficiencyRatio = revenue / (revenue + expenses);
    return Math.min(100, Math.max(0, efficiencyRatio * 100));
  }

  private sumTransactionsByType(transactions: any[], type: TransactionType, currency: string): number {
    return transactions
      .filter(t => t.type === type && t.currency === currency)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateRecommendations(score: number): string[] {
    const recommendations = [];
    
    if (score < 70) {
      recommendations.push('Focus on improving cash flow management');
      recommendations.push('Review and optimize expense structure');
    }
    
    if (score < 80) {
      recommendations.push('Consider diversifying revenue streams');
      recommendations.push('Implement cost control measures');
    }
    
    if (score >= 90) {
      recommendations.push('Maintain current performance levels');
      recommendations.push('Consider expansion opportunities');
    }
    
    return recommendations;
  }

  private calculateTrend(transactions: any[], currency: string): number {
    // Calculate trend by comparing recent vs older transactions
    const sortedTransactions = transactions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const midPoint = Math.floor(sortedTransactions.length / 2);
    
    const recent = sortedTransactions.slice(midPoint);
    const older = sortedTransactions.slice(0, midPoint);
    
    const recentRevenue = this.sumTransactionsByType(recent, TransactionType.FARM_REVENUE, currency);
    const olderRevenue = this.sumTransactionsByType(older, TransactionType.FARM_REVENUE, currency);
    
    if (olderRevenue === 0) return 0;
    
    return ((recentRevenue - olderRevenue) / olderRevenue) * 100;
  }

  private calculateOverduePayments(transactions: any[], currency: string) {
    const overdue = transactions.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status === TransactionStatus.PENDING
    );
    
    return {
      count: overdue.length,
      totalAmount: {
        amount: overdue.reduce((sum, t) => sum + Number(t.amount), 0),
        currency,
      },
    };
  }

  private calculateBudgetVariance(transactions: any[], currency: string): number {
    // Simplified budget variance calculation
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    
    if (revenue === 0) return 0;
    
    // Assume budget is 80% of revenue (simplified)
    const budget = revenue * 0.8;
    const variance = ((expenses - budget) / budget) * 100;
    
    return Math.round(variance * 100) / 100; // Round to 2 decimal places
  }

  private assessCashFlowRisk(transactions: any[], currency: string): 'Low' | 'Medium' | 'High' {
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    
    const cashFlowRatio = (revenue - expenses) / revenue;
    
    if (cashFlowRatio > 0.2) return 'Low';
    if (cashFlowRatio > 0.1) return 'Medium';
    return 'High';
  }

  private assessMarketRisk(orders: any[]): 'Low' | 'Medium' | 'High' {
    // Simplified market risk assessment based on order patterns
    const completedOrders = orders.filter(o => o.status === 'DELIVERED');
    const totalOrders = orders.length;
    
    if (totalOrders === 0) return 'Medium';
    
    const completionRate = completedOrders.length / totalOrders;
    
    if (completionRate > 0.8) return 'Low';
    if (completionRate > 0.6) return 'Medium';
    return 'High';
  }

  private assessOperationalRisk(): 'Low' | 'Medium' | 'High' {
    // Simplified operational risk assessment
    // In production, this would consider various operational factors
    return 'Low';
  }

  private calculateOverallRisk(indicators: any): 'Low' | 'Medium' | 'High' | 'Critical' {
    const riskFactors = [
      indicators.cashFlowRisk,
      indicators.marketRisk,
      indicators.operationalRisk,
    ];
    
    const highRiskCount = riskFactors.filter(risk => risk === 'High').length;
    const mediumRiskCount = riskFactors.filter(risk => risk === 'Medium').length;
    
    if (highRiskCount >= 2) return 'Critical';
    if (highRiskCount >= 1 || mediumRiskCount >= 2) return 'High';
    if (mediumRiskCount >= 1) return 'Medium';
    return 'Low';
  }

  private calculateRiskTrend(transactions: any[]): number {
    // Calculate risk trend based on transaction patterns
    const overdueCount = transactions.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status === TransactionStatus.PENDING
    ).length;
    
    const totalTransactions = transactions.length;
    
    if (totalTransactions === 0) return 0;
    
    const overdueRatio = overdueCount / totalTransactions;
    return Math.round(overdueRatio * 100 * 100) / 100; // Convert to percentage
  }

  private async generateRiskAlerts(organizationId: string, currency: string) {
    // Generate risk alerts based on current conditions
    const alerts = [];
    
    // Check for overdue payments
    const overdueTransactions = await this.prisma.transaction.findMany({
      where: {
        organizationId,
        currency: currency as Currency,
        dueDate: { lt: new Date() },
        status: TransactionStatus.PENDING,
      },
    });
    
    if (overdueTransactions.length > 0) {
      alerts.push({
        id: 'overdue-payments',
        type: 'financial',
        severity: overdueTransactions.length > 5 ? 'high' : 'medium',
        title: 'Overdue Payments Detected',
        description: `${overdueTransactions.length} transactions are overdue`,
        actionRequired: true,
        createdAt: new Date().toISOString(),
      });
    }
    
    return alerts;
  }

  private calculateOperatingCashFlow(transactions: any[], currency: string) {
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    
    return {
      amount: revenue - expenses,
      currency,
    };
  }

  private calculateInvestingCashFlow(transactions: any[], currency: string) {
    // For now, investing cash flow is 0
    // In production, this would include equipment purchases, land acquisitions, etc.
    return { amount: 0, currency };
  }

  private calculateFinancingCashFlow(transactions: any[], currency: string) {
    // For now, financing cash flow is 0
    // In production, this would include loans, investments, etc.
    return { amount: 0, currency };
  }

  private projectCashFlow(transactions: any[], currency: string, months: number) {
    // Simple projection based on current trends
    const currentCashFlow = this.calculateOperatingCashFlow(transactions, currency);
    const projectedAmount = currentCashFlow.amount * months;
    
    return { amount: projectedAmount, currency };
  }

  private calculateCashFlowTrend(transactions: any[], currency: string): number {
    // Calculate cash flow trend
    const sortedTransactions = transactions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const midPoint = Math.floor(sortedTransactions.length / 2);
    
    const recent = sortedTransactions.slice(midPoint);
    const older = sortedTransactions.slice(0, midPoint);
    
    const recentCashFlow = this.calculateOperatingCashFlow(recent, currency);
    const olderCashFlow = this.calculateOperatingCashFlow(older, currency);
    
    if (olderCashFlow.amount === 0) return 0;
    
    return ((recentCashFlow.amount - olderCashFlow.amount) / Math.abs(olderCashFlow.amount)) * 100;
  }

  private calculateBurnRate(transactions: any[], currency: string) {
    // Calculate monthly burn rate
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    
    const monthlyBurn = Math.max(0, expenses - revenue);
    
    return { amount: monthlyBurn, currency };
  }

  private calculateRunway(transactions: any[], currency: string): number {
    // Calculate runway in months
    const burnRate = this.calculateBurnRate(transactions, currency);
    
    if (burnRate.amount <= 0) return Infinity; // Positive cash flow
    
    // Get current cash balance (simplified)
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    const currentBalance = revenue - expenses;
    
    if (currentBalance <= 0) return 0;
    
    return Math.floor(currentBalance / burnRate.amount);
  }

  private async calculateKeyMetrics(organizationId: string, period: string, currency: string) {
    const transactions = await this.getTransactionsByPeriod(organizationId, period, currency as any);
    
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, currency);
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, currency);
    const profit = revenue - expenses;
    
    return [
      {
        id: 'revenue',
        name: 'Total Revenue',
        value: { amount: revenue, currency },
        trend: this.calculateTrend(transactions, currency),
        trendDirection: this.calculateTrend(transactions, currency) > 0 ? 'up' : 'down',
        color: 'success',
        description: 'Total revenue for the period',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'profit',
        name: 'Net Profit',
        value: { amount: profit, currency },
        trend: this.calculateTrend(transactions, currency),
        trendDirection: profit > 0 ? 'up' : 'down',
        color: profit > 0 ? 'success' : 'error',
        description: 'Net profit for the period',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'profit-margin',
        name: 'Profit Margin',
        value: revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : '0%',
        trend: this.calculateTrend(transactions, currency),
        trendDirection: this.calculateTrend(transactions, currency) > 0 ? 'up' : 'down',
        color: (profit / revenue) > 0.2 ? 'success' : 'warning',
        description: 'Profit margin percentage',
        lastUpdated: new Date().toISOString(),
      },
    ];
  }

  private determinePriority(amount: number, dueDate: Date | null): 'low' | 'medium' | 'high' | 'urgent' {
    if (!dueDate) return 'medium';
    
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'urgent';
    if (daysUntilDue <= 1) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  }

  private async generateInsights(organizationId: string) {
    // Generate insights based on current data
    const insights = [];
    
    // Get recent transactions for analysis
    const transactions = await this.prisma.transaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    
    const revenue = this.sumTransactionsByType(transactions, TransactionType.FARM_REVENUE, 'USD');
    const expenses = this.sumTransactionsByType(transactions, TransactionType.FARM_EXPENSE, 'USD');
    
    // Generate revenue insight
    if (revenue > 0) {
      insights.push({
        id: 'revenue-trend',
        category: 'performance',
        title: 'Revenue Performance',
        description: `Current revenue is $${revenue.toLocaleString()}. Consider strategies to increase revenue streams.`,
        impact: revenue > 100000 ? 'high' : 'medium',
        confidence: 0.8,
        actionable: true,
        recommendations: ['Diversify revenue streams', 'Optimize pricing strategy'],
        createdAt: new Date().toISOString(),
      });
    }
    
    // Generate cost insight
    if (expenses > 0) {
      const costRatio = expenses / revenue;
      if (costRatio > 0.8) {
        insights.push({
          id: 'cost-optimization',
          category: 'efficiency',
          title: 'Cost Optimization Opportunity',
          description: `Cost ratio is ${(costRatio * 100).toFixed(1)}%. Consider cost reduction strategies.`,
          impact: 'high',
          confidence: 0.9,
          actionable: true,
          recommendations: ['Review expense categories', 'Implement cost controls'],
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return insights;
  }
}
