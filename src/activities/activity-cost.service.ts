import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CostType, Prisma } from '@prisma/client';

export interface CostEntryData {
  type?: CostType;
  description: string;
  amount: number;
  quantity?: number;
  unit?: string;
  receipt?: string;
  vendor?: string;
}

@Injectable()
export class ActivityCostService {
  private readonly logger = new Logger(ActivityCostService.name);

  // Allowed file types for receipts
  private readonly ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv'
  ];

  // Allowed file extensions  
  private readonly ALLOWED_FILE_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.csv'
  ];

  // Max file size: 10MB
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new BadRequestException('Cost quantity must be greater than 0');
    }

    this.validateFileUpload(data.receipt || '');

    this.logger.log('Adding cost entry to activity', {
      activityId,
      userId,
      organizationId,
      type: data.type,
      amount: data.amount,
      hasReceipt: !!data.receipt
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // Create cost entry
      const costEntry = await tx.activityCost.create({
        data: {
          activityId,
          type: data.type,
          description: data.description,
          amount: new Prisma.Decimal(data.amount),
          quantity: data.quantity ? new Prisma.Decimal(data.quantity) : null,
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

    // Validate file upload if receipt is being updated
    if (data.receipt !== undefined) {
      this.validateFileUpload(data.receipt);
    }

    this.logger.log('Updating cost entry', {
      costId,
      activityId,
      userId,
      organizationId,
      hasReceiptUpdate: data.receipt !== undefined
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // Update cost entry
      const updateData: any = {
        updatedById: userId,
      };

      if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
      if (data.description !== undefined) updateData.description = data.description;
      if (data.receipt !== undefined) updateData.receipt = data.receipt;
      if (data.vendor !== undefined) updateData.vendor = data.vendor;
      if (data.quantity !== undefined) updateData.quantity = data.quantity ? new Prisma.Decimal(data.quantity) : null;
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

  private validateFileUpload(fileUrl: string): void {
    if (!fileUrl || !fileUrl.trim()) {
      return; // File is optional
    }

    try {
      const url = new URL(fileUrl);
      
      // Validate URL scheme (only allow https for security)
      if (!['https', 'http'].includes(url.protocol.slice(0, -1))) {
        this.logger.warn('Invalid file URL protocol attempted', {
          fileUrl: fileUrl.substring(0, 100), // Log only first 100 chars for security
          protocol: url.protocol
        });
        throw new BadRequestException('Invalid file URL: only HTTP/HTTPS protocols are allowed');
      }

      // Extract file extension from URL path
      const pathname = url.pathname.toLowerCase();
      const extension = pathname.substring(pathname.lastIndexOf('.'));
      
      if (!this.ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        this.logger.warn('Invalid file extension attempted', {
          fileUrl: fileUrl.substring(0, 100),
          extension,
          allowedExtensions: this.ALLOWED_FILE_EXTENSIONS
        });
        throw new BadRequestException(
          `Invalid file type. Allowed extensions: ${this.ALLOWED_FILE_EXTENSIONS.join(', ')}`
        );
      }

      // Additional validation: check for suspicious patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /<script/i,
        /\.exe$/i,
        /\.bat$/i,
        /\.cmd$/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(fileUrl))) {
        this.logger.error('Suspicious file URL detected', {
          fileUrl: fileUrl.substring(0, 100)
        });
        throw new BadRequestException('Invalid file URL: suspicious content detected');
      }

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error('Error validating file URL', {
        error: error.message,
        fileUrl: fileUrl.substring(0, 100)
      });
      throw new BadRequestException('Invalid file URL format');
    }
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
