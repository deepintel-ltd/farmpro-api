import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CropCyclesService {
  private readonly logger = new Logger(CropCyclesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Crop Cycle CRUD Operations
  // =============================================================================

  async getCropCycles(query: {
    farmId?: string;
    areaId?: string;
    cropType?: string;
    generation?: string;
    status?: string;
    activeOnly?: boolean;
    organizationId?: string;
  }) {
    const { farmId, areaId, cropType, generation, status, activeOnly, organizationId } = query;

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

    const where: Prisma.CropCycleWhereInput = {
      ...(farmId && { farmId }),
      ...(areaId && { areaId }),
      ...(cropType && { variety: { contains: cropType, mode: 'insensitive' } }),
      ...(generation && { generation }),
      ...(status && { status: status as any }),
    };

    const cropCycles = await this.prisma.cropCycle.findMany({
      where,
      include: {
        area: true,
        commodity: true,
        season: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: cropCycles.map((cc) => this.transformToJsonApi(cc)),
      meta: {
        totalCount: cropCycles.length,
      },
    };
  }

  async getCropCycle(id: string, organizationId?: string) {
    const cropCycle = await this.prisma.cropCycle.findFirst({
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
        commodity: true,
        season: true,
      },
    });

    if (!cropCycle) {
      throw new NotFoundException(`Crop cycle with ID ${id} not found`);
    }

    return {
      data: this.transformToJsonApi(cropCycle),
    };
  }

  async createCropCycle(requestData: any, organizationId: string) {
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

    // Check if area exists and belongs to farm
    if (attributes.areaId) {
      const area = await this.prisma.area.findFirst({
        where: {
          id: attributes.areaId,
          farmId: attributes.farmId,
        },
      });

      if (!area) {
        throw new NotFoundException('Area not found or does not belong to farm');
      }
    }

    // Get or create a default season for the farm
    let season = await this.prisma.season.findFirst({
      where: {
        farmId: attributes.farmId,
        isActive: true,
      },
    });

    if (!season) {
      season = await this.prisma.season.create({
        data: {
          farmId: attributes.farmId,
          name: 'Default Season',
          year: new Date().getFullYear(),
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Get or create a default commodity
    const commodity = await this.prisma.commodity.findFirst({
      where: {
        OR: [
          { isGlobal: true, name: attributes.cropType },
          { isGlobal: true, name: attributes.variety || attributes.cropType },
        ],
      },
    });

    let commodityId = commodity?.id;

    if (!commodityId) {
      const newCommodity = await this.prisma.commodity.create({
        data: {
          name: attributes.cropType,
          category: 'CROP',
          quantity: 0,
          unit: attributes.yieldUnit || 'kg',
          isGlobal: true,
        },
      });
      commodityId = newCommodity.id;
    }

    try {
      const cropCycle = await this.prisma.cropCycle.create({
        data: {
          farmId: attributes.farmId,
          seasonId: season.id,
          areaId: attributes.areaId || (attributes.areaId ? attributes.areaId : attributes.areaId),
          commodityId,
          plantingDate: new Date(attributes.plantingDate),
          expectedHarvestDate: new Date(attributes.expectedHarvestDate),
          plantedArea: attributes.plantedArea || 0,
          status: attributes.status || 'PLANNED',
          expectedYield: attributes.expectedYield || null,
          yieldUnit: attributes.yieldUnit || null,
          variety: attributes.variety || null,
          generation: attributes.generation || null,
          notes: attributes.notes || null,
          metadata: attributes.metadata || {},
        },
        include: {
          area: true,
          commodity: true,
          season: true,
        },
      });

      this.logger.log(`Crop cycle created: ${cropCycle.id} for farm ${attributes.farmId}`);

      return {
        data: this.transformToJsonApi(cropCycle),
      };
    } catch (error) {
      this.logger.error('Failed to create crop cycle:', error);
      throw new BadRequestException('Failed to create crop cycle');
    }
  }

  async updateCropCycle(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const existingCycle = await this.prisma.cropCycle.findFirst({
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

    if (!existingCycle) {
      throw new NotFoundException(`Crop cycle with ID ${id} not found`);
    }

    try {
      const updateData: any = {};
      if (attributes.cropType) updateData.variety = attributes.cropType;
      if (attributes.variety) updateData.variety = attributes.variety;
      if (attributes.generation) updateData.generation = attributes.generation;
      if (attributes.plantingDate) updateData.plantingDate = new Date(attributes.plantingDate);
      if (attributes.expectedHarvestDate)
        updateData.expectedHarvestDate = new Date(attributes.expectedHarvestDate);
      if (attributes.actualHarvestDate !== undefined)
        updateData.harvestDate = attributes.actualHarvestDate ? new Date(attributes.actualHarvestDate) : null;
      if (attributes.status) updateData.status = attributes.status;
      if (attributes.expectedYield !== undefined) updateData.expectedYield = attributes.expectedYield;
      if (attributes.actualYield !== undefined) updateData.actualYield = attributes.actualYield;
      if (attributes.notes !== undefined) updateData.notes = attributes.notes;
      if (attributes.metadata) {
        const existingMetadata = (existingCycle.metadata as any) || {};
        updateData.metadata = {
          ...existingMetadata,
          ...attributes.metadata,
        };
      }

      const cropCycle = await this.prisma.cropCycle.update({
        where: { id },
        data: updateData,
        include: {
          area: true,
          commodity: true,
          season: true,
        },
      });

      this.logger.log(`Crop cycle ${id} updated`);

      return {
        data: this.transformToJsonApi(cropCycle),
      };
    } catch (error) {
      this.logger.error(`Failed to update crop cycle ${id}:`, error);
      throw new BadRequestException('Failed to update crop cycle');
    }
  }

  async deleteCropCycle(id: string, organizationId?: string) {
    const existingCycle = await this.prisma.cropCycle.findFirst({
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

    if (!existingCycle) {
      throw new NotFoundException(`Crop cycle with ID ${id} not found`);
    }

    await this.prisma.cropCycle.delete({
      where: { id },
    });

    this.logger.log(`Crop cycle ${id} deleted`);
  }

  async getRotationRecommendations(query: {
    farmId: string;
    areaId?: string;
    previousCrop?: string;
  }) {
    // Simple rotation recommendations based on previous crops
    const recommendations = [
      {
        cropType: 'maize',
        reason: 'Good rotation with groundnuts',
        benefits: ['Nutrient balance', 'Pest control'],
        considerations: ['Requires good soil moisture'],
      },
      {
        cropType: 'cowpea',
        reason: 'Legume for soil fertility',
        benefits: ['Nitrogen fixation', 'Soil health'],
        considerations: ['Needs warm weather'],
      },
    ];

    return {
      data: {
        type: 'rotation-recommendations',
        id: 'dummy-id',
        attributes: {
          recommendations,
          lastCropCycle: null,
        },
      },
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private transformToJsonApi(cropCycle: any) {
    return {
      type: 'crop-cycles',
      id: cropCycle.id,
      attributes: {
        farmId: cropCycle.farmId,
        areaId: cropCycle.areaId,
        cropType: cropCycle.commodity?.name || 'Unknown',
        variety: cropCycle.variety || null,
        generation: cropCycle.generation || null,
        plantingDate: cropCycle.plantingDate?.toISOString(),
        expectedHarvestDate: cropCycle.expectedHarvestDate?.toISOString() || null,
        actualHarvestDate: cropCycle.harvestDate?.toISOString() || null,
        status: cropCycle.status,
        plantedArea: cropCycle.plantedArea,
        plantedAreaUnit: 'acres',
        expectedYield: cropCycle.expectedYield || null,
        actualYield: cropCycle.actualYield || null,
        yieldUnit: cropCycle.yieldUnit || null,
        notes: cropCycle.notes || null,
        metadata: cropCycle.metadata || {},
        createdAt: cropCycle.createdAt?.toISOString(),
        updatedAt: cropCycle.updatedAt?.toISOString(),
      },
      ...(cropCycle.area && {
        relationships: {
          area: {
            data: {
              type: 'areas',
              id: cropCycle.areaId,
            },
          },
          ...(cropCycle.commodity && {
            commodity: {
              data: {
                type: 'commodities',
                id: cropCycle.commodityId,
              },
            },
          }),
        },
      }),
    };
  }
}

