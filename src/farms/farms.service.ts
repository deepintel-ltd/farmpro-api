import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFarmRequest, UpdateFarmRequest, FarmResource } from '../../contracts/schemas';
import { Prisma } from '@prisma/client';

@Injectable()
export class FarmsService {
  private readonly logger = new Logger(FarmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Farm CRUD Operations
  // =============================================================================

  async getFarms(query: {
    'page[number]'?: number;
    'page[size]'?: number;
    search?: string;
    isActive?: boolean;
    organizationId?: string;
  }) {
    const page = query['page[number]'] || 1;
    const limit = query['page[size]'] || 10;
    const { search, isActive, organizationId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FarmWhereInput = {
      ...(organizationId && { organizationId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { location: { path: ['address'], string_contains: search } },
        ],
      }),
    };

    const [farms, total] = await Promise.all([
      this.prisma.farm.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.farm.count({ where }),
    ]);

    return {
      data: farms.map(farm => this.transformToJsonApi(farm)),
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getFarm(id: string, organizationId?: string) {
    const where: Prisma.FarmWhereInput = {
      id,
      ...(organizationId && { organizationId }),
    };

    const farm = await this.prisma.farm.findFirst({
      where,
      include: {
        organization: true,
        commodities: true,
      },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID ${id} not found`);
    }

    return {
      data: this.transformToJsonApi(farm),
    };
  }

  async createFarm(requestData: CreateFarmRequest, organizationId: string) {
    const { data } = requestData;
    const { attributes } = data;

    try {
      const farm = await this.prisma.farm.create({
        data: {
          name: attributes.name,
          totalArea: attributes.size,
          location: attributes.location,
          cropTypes: attributes.cropTypes,
          certifications: attributes.certifications || [],
          establishedDate: new Date(attributes.establishedDate),
          organizationId,
          isActive: true,
          isPublic: false,
        },
        include: {
          organization: true,
        },
      });

      this.logger.log(`Farm created: ${farm.name} (${farm.id})`);

      return {
        data: this.transformToJsonApi(farm),
      };
    } catch (error) {
      this.logger.error('Failed to create farm:', error);
      throw new BadRequestException('Failed to create farm');
    }
  }

  async updateFarm(id: string, requestData: UpdateFarmRequest, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const where: Prisma.FarmWhereInput = {
      id,
      ...(organizationId && { organizationId }),
    };

    const existingFarm = await this.prisma.farm.findFirst({ where });
    if (!existingFarm) {
      throw new NotFoundException(`Farm with ID ${id} not found`);
    }

    try {
      const farm = await this.prisma.farm.update({
        where: { id },
        data: {
          ...(attributes.name && { name: attributes.name }),
          ...(attributes.size && { totalArea: attributes.size }),
          ...(attributes.location && { location: attributes.location }),
          ...(attributes.cropTypes && { cropTypes: attributes.cropTypes }),
          ...(attributes.certifications !== undefined && { certifications: attributes.certifications }),
          ...(attributes.establishedDate && { establishedDate: new Date(attributes.establishedDate) }),
        },
        include: {
          organization: true,
        },
      });

      this.logger.log(`Farm updated: ${farm.name} (${farm.id})`);

      return {
        data: this.transformToJsonApi(farm),
      };
    } catch (error) {
      this.logger.error(`Failed to update farm ${id}:`, error);
      throw new BadRequestException('Failed to update farm');
    }
  }

  async deleteFarm(id: string, organizationId?: string) {
    const where: Prisma.FarmWhereInput = {
      id,
      ...(organizationId && { organizationId }),
    };

    const existingFarm = await this.prisma.farm.findFirst({ where });
    if (!existingFarm) {
      throw new NotFoundException(`Farm with ID ${id} not found`);
    }

    try {
      await this.prisma.farm.update({
        where: { id },
        data: { isActive: false },
      });

      this.logger.log(`Farm soft deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete farm ${id}:`, error);
      throw new BadRequestException('Failed to delete farm');
    }
  }

  // =============================================================================
  // Farm Relationships
  // =============================================================================

  async getFarmCommodities(farmId: string, query: { page?: number; limit?: number }, organizationId?: string) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FarmWhereInput = {
      id: farmId,
      ...(organizationId && { organizationId }),
    };

    const farm = await this.prisma.farm.findFirst({ where });
    if (!farm) {
      throw new NotFoundException(`Farm with ID ${farmId} not found`);
    }

    const [commodities, total] = await Promise.all([
      this.prisma.commodity.findMany({
        where: { farmId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commodity.count({ where: { farmId } }),
    ]);

    return {
      data: commodities.map(commodity => ({
        id: commodity.id,
        type: 'commodities' as const,
        attributes: {
          name: commodity.name,
          category: commodity.category as 'grain' | 'vegetable' | 'fruit' | 'livestock',
          variety: commodity.variety || undefined,
          qualityGrade: commodity.qualityGrade as 'premium' | 'standard' | 'utility',
          quantity: commodity.quantity,
          unit: commodity.unit as 'bushel' | 'pound' | 'ton' | 'head',
          harvestDate: commodity.harvestDate.toISOString(),
          storageLocation: commodity.storageLocation,
        },
      })),
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private transformToJsonApi(farm: any): FarmResource['data'] {
    return {
      id: farm.id,
      type: 'farms',
      attributes: {
        name: farm.name,
        location: farm.location,
        size: farm.totalArea,
        cropTypes: farm.cropTypes,
        establishedDate: farm.establishedDate.toISOString(),
        certifications: farm.certifications || [],
        isActive: farm.isActive,
      },
      relationships: {
        organization: {
          data: {
            id: farm.organizationId,
            type: 'organizations',
          },
        },
      },
    };
  }
}
