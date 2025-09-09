import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CostType, Decimal } from '@prisma/client';

export interface CostEntryData {
  type: CostType;
  description: string;
  amount: number;
  quantity?: number;
  unit?: string;
  receipt?: string;
  vendor?: string;
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

    const costs = await this.prisma.activityCost.findMany({
      where: { activityId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: costs.map(cost => ({
        id: cost.id,
        type: 'cost-entries' as const,
        attributes: {
          id: cost.id,
          activityId: cost.activityId,
          type: cost.type,
          description: cost.description,
          amount: parseFloat(cost.amount.toString()),
          quantity: cost.quantity ? parseFloat(cost.quantity.toString()) : null,
          unit: cost.unit,
          receipt: cost.receipt,
          vendor: cost.vendor,
          createdAt: cost.createdAt.toISOString(),
          updatedAt: cost.updatedAt.toISOString(),
          createdBy: cost.createdBy,
          updatedBy: cost.updatedBy,
        },
      })),
      meta: {
        totalCosts: costs.length,
        totalAmount: costs.reduce((sum, cost) => sum + parseFloat(cost.amount.toString()), 0),
      },
    };
  }

  async addCost(activityId: string, data: CostEntryData, userId: string, organizationId: string) {
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

    // Validate quantity if provided
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new BadRequestException('Cost quantity must be greater than 0');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create cost entry
      const costEntry = await tx.activityCost.create({
        data: {
          activityId,
          type: data.type,
          description: data.description,
          amount: new Decimal(data.amount),
          quantity: data.quantity ? new Decimal(data.quantity) : null,
          unit: data.unit,
          receipt: data.receipt,
          vendor: data.vendor,
          createdById: userId,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Update activity total cost
      const totalCosts = await tx.activityCost.aggregate({
        where: { activityId },
        _sum: { amount: true },
      });

      const totalCost = totalCosts._sum.amount ? parseFloat(totalCosts._sum.amount.toString()) : 0;

      await tx.farmActivity.update({
        where: { id: activityId },
        data: { cost: totalCost },
      });

      return costEntry;
    });

    return {
      data: {
        id: result.id,
        type: 'cost-entries' as const,
        attributes: {
          id: result.id,
          activityId: result.activityId,
          type: result.type,
          description: result.description,
          amount: parseFloat(result.amount.toString()),
          quantity: result.quantity ? parseFloat(result.quantity.toString()) : null,
          unit: result.unit,
          receipt: result.receipt,
          vendor: result.vendor,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
          createdBy: result.createdBy,
        },
      },
    };
  }

  async updateCost(activityId: string, costId: string, data: {
    amount?: number;
    description?: string;
    receipt?: string;
    vendor?: string;
    quantity?: number;
    unit?: string;
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

    // Verify cost exists
    const existingCost = await this.prisma.activityCost.findFirst({
      where: {
        id: costId,
        activityId,
      },
    });

    if (!existingCost) {
      throw new NotFoundException('Cost entry not found');
    }

    // Validate amount if provided
    if (data.amount !== undefined && data.amount <= 0) {
      throw new BadRequestException('Cost amount must be greater than 0');
    }

    // Validate quantity if provided
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new BadRequestException('Cost quantity must be greater than 0');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update cost entry
      const updateData: any = {
        updatedById: userId,
      };

      if (data.amount !== undefined) updateData.amount = new Decimal(data.amount);
      if (data.description !== undefined) updateData.description = data.description;
      if (data.receipt !== undefined) updateData.receipt = data.receipt;
      if (data.vendor !== undefined) updateData.vendor = data.vendor;
      if (data.quantity !== undefined) updateData.quantity = data.quantity ? new Decimal(data.quantity) : null;
      if (data.unit !== undefined) updateData.unit = data.unit;

      const costEntry = await tx.activityCost.update({
        where: { id: costId },
        data: updateData,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Update activity total cost
      const totalCosts = await tx.activityCost.aggregate({
        where: { activityId },
        _sum: { amount: true },
      });

      const totalCost = totalCosts._sum.amount ? parseFloat(totalCosts._sum.amount.toString()) : 0;

      await tx.farmActivity.update({
        where: { id: activityId },
        data: { cost: totalCost },
      });

      return costEntry;
    });

    return {
      data: {
        id: result.id,
        type: 'cost-entries' as const,
        attributes: {
          id: result.id,
          activityId: result.activityId,
          type: result.type,
          description: result.description,
          amount: parseFloat(result.amount.toString()),
          quantity: result.quantity ? parseFloat(result.quantity.toString()) : null,
          unit: result.unit,
          receipt: result.receipt,
          vendor: result.vendor,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
          createdBy: result.createdBy,
          updatedBy: result.updatedBy,
        },
      },
    };
  }

  async deleteCost(activityId: string, costId: string, organizationId: string) {
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

    if (activity.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete costs from completed activity');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete cost entry
      await tx.activityCost.delete({
        where: { id: costId },
      });

      // Update activity total cost
      const totalCosts = await tx.activityCost.aggregate({
        where: { activityId },
        _sum: { amount: true },
      });

      const totalCost = totalCosts._sum.amount ? parseFloat(totalCosts._sum.amount.toString()) : 0;

      await tx.farmActivity.update({
        where: { id: activityId },
        data: { cost: totalCost },
      });
    });
  }

  async getCostSummary(activityId: string, organizationId: string) {
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

    const summary = await this.prisma.activityCost.groupBy({
      by: ['type'],
      where: { activityId },
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    });

    return {
      data: {
        id: activityId,
        type: 'cost-summary' as const,
        attributes: {
          activityId,
          breakdown: summary.map(item => ({
            type: item.type,
            totalAmount: parseFloat(item._sum.amount?.toString() || '0'),
            count: item._count.id,
            averageAmount: parseFloat(item._avg.amount?.toString() || '0'),
          })),
          totalAmount: activity.cost || 0,
          totalEntries: summary.reduce((sum, item) => sum + item._count.id, 0),
        },
      },
    };
  }
}
