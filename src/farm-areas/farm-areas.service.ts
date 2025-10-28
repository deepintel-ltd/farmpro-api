import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FarmAreasService {
  private readonly logger = new Logger(FarmAreasService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Area CRUD Operations
  // =============================================================================

  async getFarmAreas(farmId: string, query: {
    'page[number]'?: number;
    'page[size]'?: number;
    status?: 'ACTIVE' | 'FALLOW' | 'MAINTENANCE';
    organizationId?: string;
  }) {
    const page = query['page[number]'] || 1;
    const limit = query['page[size]'] || 10;
    const { status, organizationId } = query;
    const skip = (page - 1) * limit;

    // Verify farm belongs to organization
    const farm = await this.prisma.farm.findFirst({
      where: {
        id: farmId,
        ...(organizationId && { organizationId }),
      },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID ${farmId} not found`);
    }

    const where: Prisma.AreaWhereInput = {
      farmId,
      ...(status && { status }),
    };

    const [areas, total] = await Promise.all([
      this.prisma.area.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.area.count({ where }),
    ]);

    return {
      data: areas.map(area => this.transformToJsonApi(area)),
      meta: {
        totalCount: total,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getArea(id: string, organizationId?: string) {
    const area = await this.prisma.area.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
      include: {
        farm: true,
      },
    });

    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }

    return {
      data: this.transformToJsonApi(area),
    };
  }

  async createArea(requestData: any, organizationId: string) {
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
      const area = await this.prisma.area.create({
        data: {
          farmId: attributes.farmId,
          name: attributes.name,
          size: attributes.size,
          boundaries: attributes.coordinates || null,
          isActive: attributes.status !== 'FALLOW',
          metadata: {
            unit: attributes.unit || 'acres',
            soilType: attributes.soilType,
            status: attributes.status || 'ACTIVE',
            description: attributes.description,
            ...(attributes.metadata || {}),
          },
        },
        include: {
          farm: true,
        },
      });

      this.logger.log(`Area created: ${area.name} (${area.id}) for farm ${attributes.farmId}`);

      return {
        data: this.transformToJsonApi(area),
      };
    } catch (error) {
      this.logger.error('Failed to create area:', error);
      throw new BadRequestException('Failed to create area');
    }
  }

  async updateArea(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const existingArea = await this.prisma.area.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingArea) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }

    try {
      const updateData: any = {};
      if (attributes.name) updateData.name = attributes.name;
      if (attributes.size) updateData.size = attributes.size;
      if (attributes.coordinates) updateData.boundaries = attributes.coordinates;
      if (attributes.status) {
        updateData.isActive = attributes.status !== 'FALLOW';
      }

      // Merge metadata
      if (attributes.unit || attributes.soilType || attributes.status || attributes.description || attributes.metadata) {
        const existingMetadata = (existingArea.metadata as any) || {};
        updateData.metadata = {
          ...existingMetadata,
          ...(attributes.unit && { unit: attributes.unit }),
          ...(attributes.soilType && { soilType: attributes.soilType }),
          ...(attributes.status && { status: attributes.status }),
          ...(attributes.description !== undefined && { description: attributes.description }),
          ...(attributes.metadata || {}),
        };
      }

      const area = await this.prisma.area.update({
        where: { id },
        data: updateData,
        include: {
          farm: true,
        },
      });

      this.logger.log(`Area ${id} updated`);

      return {
        data: this.transformToJsonApi(area),
      };
    } catch (error) {
      this.logger.error(`Failed to update area ${id}:`, error);
      throw new BadRequestException('Failed to update area');
    }
  }

  async deleteArea(id: string, organizationId?: string) {
    const existingArea = await this.prisma.area.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingArea) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }

    await this.prisma.area.delete({
      where: { id },
    });

    this.logger.log(`Area ${id} deleted`);
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private transformToJsonApi(area: any) {
    const metadata = (area.metadata as any) || {};

    return {
      type: 'areas',
      id: area.id,
      attributes: {
        farmId: area.farmId,
        name: area.name,
        description: metadata.description || null,
        size: area.size,
        unit: metadata.unit || 'acres',
        coordinates: area.boundaries,
        soilType: metadata.soilType || null,
        status: metadata.status || (area.isActive ? 'ACTIVE' : 'FALLOW'),
        metadata: metadata,
        createdAt: area.createdAt?.toISOString(),
        updatedAt: area.updatedAt?.toISOString() || area.createdAt?.toISOString(),
      },
      ...(area.farm && {
        relationships: {
          farm: {
            data: {
              type: 'farms',
              id: area.farmId,
            },
          },
        },
      }),
    };
  }
}
