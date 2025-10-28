import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class InfrastructureService {
  private readonly logger = new Logger(InfrastructureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getInfrastructure(query: any) {
    const { farmId, type, status, operationalOnly, organizationId } = query;

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
      ...(type && { type }),
      ...(status && { status }),
      ...(operationalOnly && { status: 'OPERATIONAL' }),
    };

    const infrastructure = await this.prisma.infrastructure.findMany({
      where,
      include: {
        uptimeLogs: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: infrastructure.map((infra) => this.transformToJsonApi(infra)),
      meta: {
        totalCount: infrastructure.length,
      },
    };
  }

  async getInfrastructureItem(id: string, organizationId?: string) {
    const infra = await this.prisma.infrastructure.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
      include: {
        farm: true,
        uptimeLogs: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!infra) {
      throw new NotFoundException(`Infrastructure with ID ${id} not found`);
    }

    return {
      data: this.transformToJsonApi(infra),
    };
  }

  async createInfrastructure(requestData: any, organizationId: string) {
    const { data } = requestData;
    const { attributes } = data;

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
      const infra = await this.prisma.infrastructure.create({
        data: {
          farmId: attributes.farmId,
          name: attributes.name,
          type: attributes.type,
          description: attributes.description || null,
          status: attributes.status || 'PLANNED',
          startDate: new Date(attributes.timeline.startDate),
          expectedEndDate: new Date(attributes.timeline.expectedEndDate),
          estimatedBudget: attributes.budget?.estimated || null,
          currency: attributes.budget?.currency || 'NGN',
          progress: 0,
          locationLat: attributes.location?.lat || null,
          locationLng: attributes.location?.lng || null,
          targetUptime: attributes.uptime?.target || null,
          specifications: attributes.specifications || {},
          metadata: attributes.metadata || {},
        },
        include: {
          farm: true,
        },
      });

      this.logger.log(`Infrastructure created: ${infra.id} for farm ${attributes.farmId}`);

      return {
        data: this.transformToJsonApi(infra),
      };
    } catch (error) {
      this.logger.error('Failed to create infrastructure:', error);
      throw new BadRequestException('Failed to create infrastructure');
    }
  }

  async updateInfrastructure(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const existingInfra = await this.prisma.infrastructure.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingInfra) {
      throw new NotFoundException(`Infrastructure with ID ${id} not found`);
    }

    try {
      const updateData: any = {};
      if (attributes.name) updateData.name = attributes.name;
      if (attributes.description !== undefined) updateData.description = attributes.description;
      if (attributes.status) updateData.status = attributes.status;
      if (attributes.progress !== undefined) updateData.progress = attributes.progress;
      if (attributes.timeline) {
        if (attributes.timeline.startDate) updateData.startDate = new Date(attributes.timeline.startDate);
        if (attributes.timeline.expectedEndDate) updateData.expectedEndDate = new Date(attributes.timeline.expectedEndDate);
        if (attributes.timeline.actualEndDate !== undefined) updateData.actualEndDate = attributes.timeline.actualEndDate ? new Date(attributes.timeline.actualEndDate) : null;
      }
      if (attributes.budget) {
        if (attributes.budget.estimated !== undefined) updateData.estimatedBudget = attributes.budget.estimated;
        if (attributes.budget.actual !== undefined) updateData.actualBudget = attributes.budget.actual;
      }
      if (attributes.uptime) {
        if (attributes.uptime.target !== undefined) updateData.targetUptime = attributes.uptime.target;
        if (attributes.uptime.actual !== undefined) updateData.actualUptime = attributes.uptime.actual;
      }
      if (attributes.specifications) updateData.specifications = attributes.specifications;
      if (attributes.metadata) {
        const existingMetadata = (existingInfra.metadata as any) || {};
        updateData.metadata = {
          ...existingMetadata,
          ...attributes.metadata,
        };
      }

      const infra = await this.prisma.infrastructure.update({
        where: { id },
        data: updateData,
        include: {
          farm: true,
        },
      });

      this.logger.log(`Infrastructure ${id} updated`);

      return {
        data: this.transformToJsonApi(infra),
      };
    } catch (error) {
      this.logger.error(`Failed to update infrastructure ${id}:`, error);
      throw new BadRequestException('Failed to update infrastructure');
    }
  }

  async deleteInfrastructure(id: string, organizationId?: string) {
    const existingInfra = await this.prisma.infrastructure.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingInfra) {
      throw new NotFoundException(`Infrastructure with ID ${id} not found`);
    }

    await this.prisma.infrastructure.delete({
      where: { id },
    });

    this.logger.log(`Infrastructure ${id} deleted`);
  }

  async logUptime(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const infra = await this.prisma.infrastructure.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!infra) {
      throw new NotFoundException(`Infrastructure with ID ${id} not found`);
    }

    try {
      const log = await this.prisma.infrastructureUptimeLog.create({
        data: {
          infrastructureId: id,
          timestamp: new Date(attributes.timestamp || Date.now()),
          status: attributes.status as any,
          reason: attributes.reason || null,
          duration: attributes.duration || null,
          notes: attributes.notes || null,
        },
      });

      // Calculate and update actual uptime
      const logs = await this.prisma.infrastructureUptimeLog.findMany({
        where: { infrastructureId: id },
      });

      const totalLogs = logs.length;
      const upLogs = logs.filter((l) => l.status === 'UP').length;
      const uptime = totalLogs > 0 ? (upLogs / totalLogs) * 100 : 0;

      await this.prisma.infrastructure.update({
        where: { id },
        data: { actualUptime: uptime },
      });

      this.logger.log(`Uptime logged for infrastructure ${id}`);

      return {
        data: {
          type: 'uptime-log',
          id: log.id,
          attributes: {
            timestamp: log.timestamp.toISOString(),
            status: log.status,
            reason: log.reason,
            duration: log.duration,
            notes: log.notes,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to log uptime for infrastructure ${id}:`, error);
      throw new BadRequestException('Failed to log uptime');
    }
  }

  async getUptimeAnalytics(id: string, organizationId?: string) {
    const infra = await this.prisma.infrastructure.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
      include: {
        uptimeLogs: true,
      },
    });

    if (!infra) {
      throw new NotFoundException(`Infrastructure with ID ${id} not found`);
    }

      const logs = infra.uptimeLogs;
      const totalLogs = logs.length;
      const upLogs = logs.filter((l) => l.status === 'UP').length;
    const uptime = totalLogs > 0 ? (upLogs / totalLogs) * 100 : 0;

    // Calculate MTBF and MTTR
    const mtbf = 0;
    const mttr = 0;

        return {
          data: {
            type: 'uptime-analytics',
            id,
            attributes: {
              targetUptime: infra.targetUptime || 0,
              actualUptime: uptime,
              downtimeEvents: logs.filter((l) => l.status === 'DOWN').length,
          mtbf,
          mttr,
        },
      },
    };
  }

  private transformToJsonApi(infra: any) {
    const metadata = (infra.metadata as any) || {};
    const specifications = (infra.specifications as any) || {};

    return {
      type: 'infrastructure',
      id: infra.id,
      attributes: {
        farmId: infra.farmId,
        name: infra.name,
        type: infra.type,
        description: infra.description || null,
        status: infra.status,
        timeline: {
          startDate: infra.startDate?.toISOString(),
          expectedEndDate: infra.expectedEndDate?.toISOString(),
          actualEndDate: infra.actualEndDate?.toISOString() || null,
        },
        budget: {
          estimated: infra.estimatedBudget,
          actual: infra.actualBudget || null,
          currency: infra.currency || 'NGN',
        },
        progress: infra.progress,
        location: infra.locationLat && infra.locationLng
          ? {
              lat: infra.locationLat,
              lng: infra.locationLng,
            }
          : null,
        specifications,
        uptime: {
          target: infra.targetUptime || null,
          actual: infra.actualUptime || null,
          lastDowntime: infra.lastMaintenanceDate?.toISOString() || null,
        },
        maintenance: {
          lastMaintenanceDate: infra.lastMaintenanceDate?.toISOString() || null,
          nextMaintenanceDate: infra.nextMaintenanceDate?.toISOString() || null,
          schedule: infra.maintenanceSchedule || null,
        },
        notes: infra.notes || null,
        metadata,
        createdAt: infra.createdAt?.toISOString(),
        updatedAt: infra.updatedAt?.toISOString(),
      },
      ...(infra.farm && {
        relationships: {
          farm: {
            data: {
              type: 'farms',
              id: infra.farmId,
            },
          },
        },
      }),
    };
  }
}

