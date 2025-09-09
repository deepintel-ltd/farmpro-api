import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CostEntry {
  id: string;
  type: string;
  description: string;
  amount: number;
  quantity?: number;
  unit?: string;
  receipt?: string;
  vendor?: string;
  createdAt: Date;
  createdBy: string;
}

@Injectable()
export class ActivityCostService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivityCosts(activityId: string, organizationId: string) {
    // Verify activity exists and user has access
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // For now, return costs from metadata
    const costs = (activity.metadata as any)?.costs || [];

    return {
      data: costs.map((cost: any, index: number) => ({
        id: `cost-${index}`,
        type: 'cost-entries',
        attributes: {
          id: `cost-${index}`,
          type: cost.type || 'other',
          description: cost.description || '',
          amount: cost.amount || 0,
          quantity: cost.quantity,
          unit: cost.unit,
          receipt: cost.receipt,
          vendor: cost.vendor,
          createdAt: cost.createdAt || new Date().toISOString(),
          createdBy: cost.createdBy || 'system',
        },
      })),
    };
  }

  async addCost(activityId: string, data: {
    type: string;
    description: string;
    amount: number;
    quantity?: number;
    unit?: string;
    receipt?: string;
    vendor?: string;
  }, userId: string, organizationId: string) {
    // Verify activity exists and user has access
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.status === 'CANCELLED') {
      throw new BadRequestException('Cannot add costs to cancelled activity');
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new BadRequestException('Cost amount must be greater than 0');
    }

    // Add cost to activity metadata
    const currentCosts = (activity.metadata as any)?.costs || [];
    const newCost = {
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    const updatedCosts = [...currentCosts, newCost];
    const updatedMetadata = {
      ...(activity.metadata as any || {}),
      costs: updatedCosts,
    };

    // Update total cost
    const totalCost = updatedCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);

    await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        cost: totalCost,
        metadata: updatedMetadata,
      },
    });

    return {
      id: `cost-${currentCosts.length}`,
      type: 'cost-entries',
      attributes: {
        id: `cost-${currentCosts.length}`,
        type: data.type,
        description: data.description,
        amount: data.amount,
        quantity: data.quantity,
        unit: data.unit,
        receipt: data.receipt,
        vendor: data.vendor,
        createdAt: newCost.createdAt,
        createdBy: userId,
      },
    };
  }

  async updateCost(activityId: string, costId: string, data: {
    amount?: number;
    description?: string;
    receipt?: string;
  }, userId: string, organizationId: string) {
    // Verify activity exists and user has access
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const costs = (activity.metadata as any)?.costs || [];
    const costIndex = parseInt(costId.replace('cost-', ''));
    
    if (costIndex < 0 || costIndex >= costs.length) {
      throw new NotFoundException('Cost entry not found');
    }

    // Update cost
    costs[costIndex] = {
      ...costs[costIndex],
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    const updatedMetadata = {
      ...(activity.metadata as any || {}),
      costs,
    };

    // Update total cost
    const totalCost = costs.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);

    await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        cost: totalCost,
        metadata: updatedMetadata,
      },
    });

    return {
      id: costId,
      type: 'cost-entries',
      attributes: {
        id: costId,
        ...costs[costIndex],
      },
    };
  }
}
