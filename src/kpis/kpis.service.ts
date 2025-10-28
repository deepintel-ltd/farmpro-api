import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KPIsService {
  private readonly logger = new Logger(KPIsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getKPIs(query: any) {
    const { farmId, metric, category, status, activeOnly, organizationId } = query;

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
      ...(metric && { metric }),
      ...(category && { category }),
      ...(status && { status }),
      ...(activeOnly && { isActive: true }),
    };

    const kpis = await this.prisma.kPI.findMany({
      where,
      include: {
        measurements: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: kpis.map((kpi) => this.transformToJsonApi(kpi)),
      meta: {
        totalCount: kpis.length,
        onTarget: kpis.filter((k) => k.status === 'ON_TARGET').length,
        warning: kpis.filter((k) => k.status === 'WARNING').length,
        critical: kpis.filter((k) => k.status === 'CRITICAL').length,
      },
    };
  }

  async getKPI(id: string, organizationId?: string) {
    const kpi = await this.prisma.kPI.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
      include: {
        farm: true,
        measurements: {
          orderBy: { measuredAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!kpi) {
      throw new NotFoundException(`KPI with ID ${id} not found`);
    }

    return {
      data: this.transformToJsonApi(kpi),
    };
  }

  async createKPI(requestData: any, organizationId: string) {
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
      const kpi = await this.prisma.kPI.create({
        data: {
          farmId: attributes.farmId,
          name: attributes.name,
          metric: attributes.metric,
          description: attributes.description || null,
          targetValue: attributes.targetValue,
          targetOperator: attributes.targetOperator,
          unit: attributes.unit,
          warningThreshold: attributes.threshold?.warning || null,
          criticalThreshold: attributes.threshold?.critical || null,
          category: attributes.category,
          alertsEnabled: attributes.alertsEnabled ?? true,
          metadata: attributes.metadata || {},
        },
        include: {
          farm: true,
        },
      });

      this.logger.log(`KPI created: ${kpi.id} for farm ${attributes.farmId}`);

      return {
        data: this.transformToJsonApi(kpi),
      };
    } catch (error) {
      this.logger.error('Failed to create KPI:', error);
      throw new BadRequestException('Failed to create KPI');
    }
  }

  async updateKPI(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const existingKPI = await this.prisma.kPI.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingKPI) {
      throw new NotFoundException(`KPI with ID ${id} not found`);
    }

    try {
      const updateData: any = {};
      if (attributes.name) updateData.name = attributes.name;
      if (attributes.description !== undefined) updateData.description = attributes.description;
      if (attributes.targetValue !== undefined) updateData.targetValue = attributes.targetValue;
      if (attributes.targetOperator) updateData.targetOperator = attributes.targetOperator;
      if (attributes.unit) updateData.unit = attributes.unit;
      if (attributes.threshold) {
        if (attributes.threshold.warning !== undefined) updateData.warningThreshold = attributes.threshold.warning;
        if (attributes.threshold.critical !== undefined) updateData.criticalThreshold = attributes.threshold.critical;
      }
      if (attributes.isActive !== undefined) updateData.isActive = attributes.isActive;
      if (attributes.alertsEnabled !== undefined) updateData.alertsEnabled = attributes.alertsEnabled;
      if (attributes.metadata) {
        const existingMetadata = (existingKPI.metadata as any) || {};
        updateData.metadata = {
          ...existingMetadata,
          ...attributes.metadata,
        };
      }

      const kpi = await this.prisma.kPI.update({
        where: { id },
        data: updateData,
        include: {
          farm: true,
        },
      });

      this.logger.log(`KPI ${id} updated`);

      return {
        data: this.transformToJsonApi(kpi),
      };
    } catch (error) {
      this.logger.error(`Failed to update KPI ${id}:`, error);
      throw new BadRequestException('Failed to update KPI');
    }
  }

  async deleteKPI(id: string, organizationId?: string) {
    const existingKPI = await this.prisma.kPI.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!existingKPI) {
      throw new NotFoundException(`KPI with ID ${id} not found`);
    }

    await this.prisma.kPI.delete({
      where: { id },
    });

    this.logger.log(`KPI ${id} deleted`);
  }

  async recordMeasurement(id: string, requestData: any, organizationId?: string) {
    const { data } = requestData;
    const { attributes } = data;

    const kpi = await this.prisma.kPI.findFirst({
      where: {
        id,
        ...(organizationId && {
          farm: { organizationId },
        }),
      },
    });

    if (!kpi) {
      throw new NotFoundException(`KPI with ID ${id} not found`);
    }

    try {
      const measurement = await this.prisma.kPIMeasurement.create({
        data: {
          kpiId: id,
          value: attributes.value,
          measuredAt: new Date(attributes.measuredAt || Date.now()),
          notes: attributes.notes || null,
          source: attributes.source || 'MANUAL',
          metadata: attributes.metadata || {},
        },
      });

      // Calculate and update KPI status
      const status = this.calculateKPIStatus(
        attributes.value,
        kpi.targetValue,
        kpi.targetOperator,
        kpi.warningThreshold,
        kpi.criticalThreshold,
      );

      await this.prisma.kPI.update({
        where: { id },
        data: {
          currentValue: attributes.value,
          status,
          lastMeasured: new Date(),
        },
      });

      this.logger.log(`Measurement recorded for KPI ${id}`);

      return {
        data: {
          type: 'kpi-measurements',
          id: measurement.id,
          attributes: {
            value: measurement.value,
            measuredAt: measurement.measuredAt.toISOString(),
            notes: measurement.notes,
            source: measurement.source,
            metadata: measurement.metadata,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to record measurement for KPI ${id}:`, error);
      throw new BadRequestException('Failed to record measurement');
    }
  }

  async getKPIDashboard(query: any) {
    // Placeholder for KPI dashboard
    return {
      data: {
        type: 'kpi-dashboard',
        id: 'dashboard',
        attributes: {
          productionKPIs: [],
          financialKPIs: [],
          operationalKPIs: [],
          alerts: [],
        },
      },
    };
  }

  async getKPITrend(id: string, query: any) {
    // Placeholder for KPI trend
    return {
      data: {
        type: 'kpi-trend',
        id,
        attributes: {
          trendData: [],
        },
      },
    };
  }

  private calculateKPIStatus(
    value: number,
    targetValue: number,
    operator: string,
    warningThreshold?: number | null,
    criticalThreshold?: number | null,
  ): 'ON_TARGET' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' {
    // Simple status calculation logic
    if (warningThreshold && value >= warningThreshold) {
      return criticalThreshold && value >= criticalThreshold ? 'CRITICAL' : 'WARNING';
    }
    return 'ON_TARGET';
  }

  private transformToJsonApi(kpi: any) {
    const metadata = (kpi.metadata as any) || {};

    return {
      type: 'kpis',
      id: kpi.id,
      attributes: {
        farmId: kpi.farmId,
        name: kpi.name,
        metric: kpi.metric,
        description: kpi.description || null,
        targetValue: kpi.targetValue,
        targetOperator: kpi.targetOperator,
        unit: kpi.unit,
        currentValue: kpi.currentValue || null,
        status: kpi.status,
        threshold: {
          warning: kpi.warningThreshold || null,
          critical: kpi.criticalThreshold || null,
        },
        category: kpi.category,
        isActive: kpi.isActive,
        alertsEnabled: kpi.alertsEnabled,
        lastMeasured: kpi.lastMeasured?.toISOString() || null,
        metadata,
        createdAt: kpi.createdAt?.toISOString(),
        updatedAt: kpi.updatedAt?.toISOString(),
      },
      ...(kpi.farm && {
        relationships: {
          farm: {
            data: {
              type: 'farms',
              id: kpi.farmId,
            },
          },
        },
      }),
    };
  }
}

