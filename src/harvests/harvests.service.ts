import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class HarvestsService {
  private readonly logger = new Logger(HarvestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Harvest CRUD Operations
  // =============================================================================

  async getHarvests(query: {
    farmId?: string;
    areaId?: string;
    cropCycleId?: string;
    cropType?: string;
    organizationId?: string;
  }) {
    const { farmId, areaId, cropCycleId, cropType, organizationId } = query;

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

    const where: any = {
      ...(farmId && { farmId }),
      ...(areaId && { areaId }),
      ...(cropCycleId && { cropCycleId }),
      ...(cropType && { cropType: { contains: cropType, mode: 'insensitive' } }),
    };

    const harvests = await this.prisma.harvest.findMany({
      where,
      include: {
        area: true,
        cropCycle: true,
      },
      orderBy: { harvestDate: 'desc' },
    });

    const totalQuantity = harvests.reduce((sum, h) => sum + h.quantity, 0);
    const totalValue = harvests.reduce((sum, h) => sum + (h.estimatedValue || 0), 0);

    return {
      data: harvests.map((harvest) => this.transformToJsonApi(harvest)),
      meta: {
        totalCount: harvests.length,
        totalQuantity,
        totalValue,
      },
    };
  }

  async getHarvest(id: string, organizationId?: string) {
    const harvest = await this.prisma.harvest.findFirst({
      where: {
        id,
        ...(organizationId && {
          area: {
            farm: {
              organizationId,
            },
          },
        }),
      },
      include: {
        area: {
          include: {
            farm: true,
          },
        },
        cropCycle: true,
      },
    });

    if (!harvest) {
      throw new NotFoundException(`Harvest with ID ${id} not found`);
    }

    return {
      data: this.transformToJsonApi(harvest),
    };
  }

  async createHarvest(requestData: any, organizationId: string) {
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

    // Verify crop cycle if provided
    if (attributes.cropCycleId) {
      const cropCycle = await this.prisma.cropCycle.findFirst({
        where: {
          id: attributes.cropCycleId,
          farmId: attributes.farmId,
        },
      });

      if (!cropCycle) {
        throw new NotFoundException('Crop cycle not found or does not belong to farm');
      }
    }

    try {
      const harvest = await this.prisma.harvest.create({
        data: {
          farmId: attributes.farmId,
          areaId: attributes.areaId || null,
          cropCycleId: attributes.cropCycleId || null,
          cropType: attributes.cropType,
          variety: attributes.variety || null,
          harvestDate: new Date(attributes.harvestDate),
          quantity: attributes.quantity,
          unit: attributes.unit,
          qualityGrade: attributes.quality?.grade || null,
          qualityMoisture: attributes.quality?.moisture || null,
          qualityNotes: attributes.quality?.notes || null,
          estimatedValue: attributes.estimatedValue || null,
          currency: attributes.currency || 'NGN',
          storageLocation: attributes.storage?.location || null,
          metadata: {
            weather: attributes.weather || {},
            ...(attributes.metadata || {}),
          },
          notes: attributes.notes || null,
        },
        include: {
          area: true,
          cropCycle: true,
        },
      });

      // Update crop cycle status to HARVESTED
      if (harvest.cropCycleId) {
        await this.prisma.cropCycle.update({
          where: { id: harvest.cropCycleId },
          data: {
            status: 'HARVESTED',
            harvestDate: harvest.harvestDate,
            actualYield: harvest.quantity,
          },
        });
      }

      // Auto-create inventory entry if requested
      if (attributes.createInventory && harvest.cropType) {
        // Get or create commodity
        let commodity = await this.prisma.commodity.findFirst({
          where: {
            isGlobal: true,
            name: harvest.cropType,
          },
        });

        if (!commodity) {
          commodity = await this.prisma.commodity.create({
            data: {
              name: harvest.cropType,
              category: 'CROP',
              quantity: 0,
              unit: harvest.unit,
              isGlobal: true,
            },
          });
        }

        await this.prisma.inventory.create({
          data: {
            organizationId: farm.organizationId,
            farmId: harvest.farmId,
            commodityId: commodity.id,
            harvestId: harvest.id,
            quantity: harvest.quantity,
            unit: harvest.unit,
            quality: harvest.qualityGrade || null,
            location: harvest.storageLocation || null,
            status: 'AVAILABLE',
          },
        });
      }

      this.logger.log(`Harvest created: ${harvest.id} for farm ${attributes.farmId}`);

      return {
        data: this.transformToJsonApi(harvest),
      };
    } catch (error) {
      this.logger.error('Failed to create harvest:', error);
      throw new BadRequestException('Failed to create harvest');
    }
  }

  async updateHarvest(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const existingHarvest = await this.prisma.harvest.findFirst({
      where: {
        id,
        ...(organizationId && {
          area: {
            farm: {
              organizationId,
            },
          },
        }),
      },
    });

    if (!existingHarvest) {
      throw new NotFoundException(`Harvest with ID ${id} not found`);
    }

    try {
      const updateData: any = {};
      if (attributes.quantity) updateData.quantity = attributes.quantity;
      if (attributes.quality) {
        updateData.qualityGrade = attributes.quality.grade || null;
        updateData.qualityMoisture = attributes.quality.moisture || null;
        updateData.qualityNotes = attributes.quality.notes || null;
      }
      if (attributes.estimatedValue !== undefined) updateData.estimatedValue = attributes.estimatedValue;
      if (attributes.actualRevenue !== undefined) updateData.actualRevenue = attributes.actualRevenue;
      if (attributes.storage) {
        updateData.storageLocation = attributes.storage.location || null;
        if (attributes.storage.inventoryId) {
          // Update inventory if ID provided
          const inventory = await this.prisma.inventory.findFirst({
            where: { id: attributes.storage.inventoryId },
          });
          if (inventory) {
            await this.prisma.inventory.update({
              where: { id: inventory.id },
              data: {
                location: attributes.storage.location,
              },
            });
          }
        }
      }
      if (attributes.notes !== undefined) updateData.notes = attributes.notes;
      if (attributes.metadata) {
        const existingMetadata = (existingHarvest.metadata as any) || {};
        updateData.metadata = {
          ...existingMetadata,
          ...attributes.metadata,
        };
      }

      const harvest = await this.prisma.harvest.update({
        where: { id },
        data: updateData,
        include: {
          area: true,
          cropCycle: true,
        },
      });

      this.logger.log(`Harvest ${id} updated`);

      return {
        data: this.transformToJsonApi(harvest),
      };
    } catch (error) {
      this.logger.error(`Failed to update harvest ${id}:`, error);
      throw new BadRequestException('Failed to update harvest');
    }
  }

  async deleteHarvest(id: string, organizationId?: string) {
    const existingHarvest = await this.prisma.harvest.findFirst({
      where: {
        id,
        ...(organizationId && {
          area: {
            farm: {
              organizationId,
            },
          },
        }),
      },
    });

    if (!existingHarvest) {
      throw new NotFoundException(`Harvest with ID ${id} not found`);
    }

    await this.prisma.harvest.delete({
      where: { id },
    });

    this.logger.log(`Harvest ${id} deleted`);
  }

  async getRevenueAnalytics(query: any) {
    // Placeholder for revenue analytics
    return {
      data: {
        type: 'revenue-analytics',
        id: 'analytics',
        attributes: {
          totalRevenue: 0,
          projectedRevenue: 0,
          revenueByMonth: [],
          revenueByCropType: [],
          revenueByQuality: [],
        },
      },
    };
  }

  async getYieldComparison(query: any) {
    // Placeholder for yield comparison
    return {
      data: {
        type: 'yield-comparison',
        id: 'comparison',
        attributes: {
          actualYield: 0,
          expectedYield: 0,
          variance: 0,
          variancePercentage: 0,
        },
      },
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private transformToJsonApi(harvest: any) {
    const metadata = (harvest.metadata as any) || {};

    return {
      type: 'harvests',
      id: harvest.id,
      attributes: {
        farmId: harvest.farmId,
        areaId: harvest.areaId,
        cropCycleId: harvest.cropCycleId,
        cropType: harvest.cropType,
        variety: harvest.variety || null,
        harvestDate: harvest.harvestDate?.toISOString(),
        quantity: harvest.quantity,
        unit: harvest.unit,
        quality: {
          grade: harvest.qualityGrade || null,
          moisture: harvest.qualityMoisture || null,
          notes: harvest.qualityNotes || null,
        },
        estimatedValue: harvest.estimatedValue || null,
        actualRevenue: harvest.actualRevenue || null,
        currency: harvest.currency || 'NGN',
        storage: {
          location: harvest.storageLocation || null,
          inventoryId: null,
        },
        weather: metadata.weather || {},
        notes: harvest.notes || null,
        metadata: metadata,
        createdAt: harvest.createdAt?.toISOString(),
        updatedAt: harvest.updatedAt?.toISOString(),
      },
      ...(harvest.area && {
        relationships: {
          farm: {
            data: {
              type: 'farms',
              id: harvest.farmId,
            },
          },
          cropCycle: harvest.cropCycleId
            ? {
                data: {
                  type: 'crop-cycles',
                  id: harvest.cropCycleId,
                },
              }
            : { data: null },
        },
      }),
    };
  }
}

