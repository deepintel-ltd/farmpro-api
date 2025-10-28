import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Budget CRUD Operations
  // =============================================================================

  async getBudgets(query: {
    farmId?: string;
    status?: string;
    activeOnly?: boolean;
    organizationId?: string;
  }) {
    const { farmId, status, activeOnly, organizationId } = query;

    // Verify farm belongs to organization
    if (farmId) {
      const farm = await this.prisma.farm.findFirst({
        where: {
          id: farmId,
          ...(organizationId && { organizationId }),
        },
      });

      if (!farm) {
        throw new NotFoundException(`Farm with ID ${farmId} not found`);
      }
    }

    const where: Prisma.BudgetWhereInput = {
      ...(farmId && { farmId }),
      ...(status && { status: status as any }),
      ...(activeOnly && { status: 'ACTIVE' }),
    };

    const budgets = await this.prisma.budget.findMany({
      where,
      include: {
        allocations: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: budgets.map((budget) => this.transformToJsonApi(budget)),
      meta: {
        totalCount: budgets.length,
      },
    };
  }

  async getBudget(id: string, organizationId?: string) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
      include: {
        allocations: true,
        farm: true,
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return {
      data: this.transformToJsonApi(budget),
    };
  }

  async createBudget(requestData: any, organizationId: string) {
    const { data } = requestData;
    const { attributes } = data;

    // Verify farm belongs to organization
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: attributes.farmId,
        organizationId,
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found or access denied');
    }

    try {
      const { allocations, period, ...restAttributes } = attributes;

      const budget = await this.prisma.budget.create({
        data: {
          farmId: attributes.farmId,
          name: restAttributes.name,
          description: restAttributes.description || null,
          startDate: new Date(period.startDate),
          endDate: new Date(period.endDate),
          totalBudget: restAttributes.totalBudget,
          currency: restAttributes.currency || 'NGN',
          status: restAttributes.status || 'DRAFT',
          metadata: restAttributes.metadata || {},
          allocations: {
            create: allocations?.map((alloc: any) => ({
              category: alloc.category,
              allocated: alloc.allocated,
              spent: 0,
            })) || [],
          },
        },
        include: {
          allocations: true,
          farm: true,
        },
      });

      this.logger.log(`Budget created: ${budget.name} (${budget.id}) for farm ${attributes.farmId}`);

      return {
        data: this.transformToJsonApi(budget),
      };
    } catch (error) {
      this.logger.error('Failed to create budget:', error);
      throw new BadRequestException('Failed to create budget');
    }
  }

  async updateBudget(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingBudget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    try {
      const updateData: any = {};

      if (attributes.name) updateData.name = attributes.name;
      if (attributes.description !== undefined) updateData.description = attributes.description;
      if (attributes.period) {
        if (attributes.period.startDate) updateData.startDate = new Date(attributes.period.startDate);
        if (attributes.period.endDate) updateData.endDate = new Date(attributes.period.endDate);
      }
      if (attributes.totalBudget) updateData.totalBudget = attributes.totalBudget;
      if (attributes.status) updateData.status = attributes.status;
      if (attributes.metadata) {
        const existingMetadata = (existingBudget.metadata as any) || {};
        updateData.metadata = {
          ...existingMetadata,
          ...attributes.metadata,
        };
      }

      // Update allocations if provided
      if (attributes.allocations) {
        await this.prisma.budgetAllocation.deleteMany({
          where: { budgetId: id },
        });

        await this.prisma.budgetAllocation.createMany({
          data: attributes.allocations.map((alloc: any) => ({
            budgetId: id,
            category: alloc.category,
            allocated: alloc.allocated,
            spent: 0,
          })),
        });
      }

      const budget = await this.prisma.budget.update({
        where: { id },
        data: updateData,
        include: {
          allocations: true,
          farm: true,
        },
      });

      this.logger.log(`Budget ${id} updated`);

      return {
        data: this.transformToJsonApi(budget),
      };
    } catch (error) {
      this.logger.error(`Failed to update budget ${id}:`, error);
      throw new BadRequestException('Failed to update budget');
    }
  }

  async deleteBudget(id: string, organizationId?: string) {
    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingBudget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    await this.prisma.budget.delete({
      where: { id },
    });

    this.logger.log(`Budget ${id} deleted`);
  }

  async getBudgetSummary(id: string, organizationId?: string) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
      include: {
        allocations: true,
        farm: true,
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    const totalSpent = budget.allocations.reduce((sum, alloc) => sum + alloc.spent, 0);
    const totalAllocated = budget.allocations.reduce((sum, alloc) => sum + alloc.allocated, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const utilizationPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    const variance = totalAllocated - totalSpent;
    const variancePercentage = totalAllocated > 0 ? (variance / totalAllocated) * 100 : 0;

    const categoryBreakdown = budget.allocations.map((alloc) => ({
      category: alloc.category,
      allocated: alloc.allocated,
      spent: alloc.spent,
      remaining: alloc.allocated - alloc.spent,
      utilizationPercentage: alloc.allocated > 0 ? (alloc.spent / alloc.allocated) * 100 : 0,
      variance: alloc.allocated - alloc.spent,
      status: alloc.spent > alloc.allocated ? 'OVER_BUDGET' : (alloc.spent / alloc.allocated > 0.9 ? 'WARNING' : 'ON_TRACK'),
    }));

    const alerts: any[] = [];
    categoryBreakdown.forEach((cat) => {
      if (cat.utilizationPercentage >= 100) {
        alerts.push({
          category: cat.category,
          type: 'OVER_BUDGET',
          message: `${cat.category} has exceeded budget allocation`,
          severity: 'high',
        });
      } else if (cat.utilizationPercentage >= 90) {
        alerts.push({
          category: cat.category,
          type: 'APPROACHING_LIMIT',
          message: `${cat.category} is approaching budget limit (${cat.utilizationPercentage.toFixed(1)}%)`,
          severity: 'medium',
        });
      } else if (cat.utilizationPercentage < 20) {
        alerts.push({
          category: cat.category,
          type: 'UNDERSPENT',
          message: `${cat.category} is underutilized (${cat.utilizationPercentage.toFixed(1)}% spent)`,
          severity: 'low',
        });
      }
    });

    return {
      data: {
        type: 'budget-summary',
        id,
        attributes: {
          totalBudget: totalAllocated,
          totalSpent,
          totalRemaining,
          utilizationPercentage,
          variance,
          variancePercentage,
          currency: budget.currency,
          categoryBreakdown,
          alerts,
          lastUpdated: budget.updatedAt?.toISOString(),
        },
      },
    };
  }

  async getCashFlowProjection(id: string, includeProjections: boolean) {
    const budget = await this.prisma.budget.findFirst({
      where: { id },
      include: {
        allocations: true,
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Simple cash flow projection
    const totalSpent = budget.allocations.reduce((sum, alloc) => sum + alloc.spent, 0);
    const totalBudget = budget.totalBudget;
    const currentBalance = totalBudget - totalSpent;

    const monthlyProjections: any[] = [];
    if (includeProjections) {
      // Generate basic monthly projections
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      let currentDate = new Date(startDate);

      let currentBalance = totalBudget;
      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyProjections.push({
          month: monthKey,
          openingBalance: currentBalance,
          inflows: 0,
          outflows: Math.random() * 500000, // Placeholder
          closingBalance: currentBalance - Math.random() * 500000,
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
        currentBalance -= Math.random() * 500000; // Placeholder
      }
    }

    return {
      data: {
        type: 'cash-flow',
        id,
        attributes: {
          currentBalance,
          projectedInflows: [],
          projectedOutflows: [],
          monthlyProjections,
          alerts: [],
        },
      },
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private transformToJsonApi(budget: any) {
    return {
      type: 'budgets',
      id: budget.id,
      attributes: {
        farmId: budget.farmId,
        name: budget.name,
        description: budget.description || null,
        period: {
          startDate: budget.startDate?.toISOString(),
          endDate: budget.endDate?.toISOString(),
        },
        totalBudget: budget.totalBudget,
        currency: budget.currency || 'NGN',
        allocations: budget.allocations?.map((alloc: any) => ({
          category: alloc.category,
          allocated: alloc.allocated,
          spent: alloc.spent,
          remaining: alloc.allocated - alloc.spent,
        })) || [],
        status: budget.status,
        metadata: budget.metadata || {},
        createdAt: budget.createdAt?.toISOString(),
        updatedAt: budget.updatedAt?.toISOString(),
      },
      ...(budget.farm && {
        relationships: {
          farm: {
            data: {
              type: 'farms',
              id: budget.farmId,
            },
          },
        },
      }),
    };
  }
}

