import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from './dto/activities.dto';

export interface ActivityTemplate {
  id: string;
  name: string;
  type: ActivityType;
  description: string;
  defaultDuration: number;
  instructions: string;
  safetyNotes: string;
  applicableCrops: string[];
  isSystem: boolean;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ActivityTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(organizationId: string, filters: { type?: ActivityType; cropType?: string } = {}) {
    const where: any = {
      OR: [
        { isSystem: true },
        { organizationId },
      ],
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.cropType) {
      where.applicableCrops = {
        has: filters.cropType,
      };
    }

    const templates = await this.prisma.activityTemplate.findMany({
      where,
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });

    return {
      data: templates.map(template => this.formatTemplateResponse(template)),
    };
  }

  async getTemplate(templateId: string, organizationId: string) {
    const template = await this.prisma.activityTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isSystem: true },
          { organizationId },
        ],
      },
    });

    if (!template) {
      throw new NotFoundException('Activity template not found');
    }

    return this.formatTemplateResponse(template);
  }

  async createTemplate(data: {
    name: string;
    type: ActivityType;
    description: string;
    defaultDuration: number;
    instructions: string;
    safetyNotes: string;
    applicableCrops: string[];
  }, organizationId: string) {
    const template = await this.prisma.activityTemplate.create({
      data: {
        ...data,
        organizationId,
        isSystem: false,
      },
    });

    return this.formatTemplateResponse(template);
  }

  async createActivityFromTemplate(
    templateId: string,
    data: {
      farmId: string;
      areaId?: string;
      cropCycleId?: string;
      scheduledAt: string;
      customizations?: {
        name?: string;
        assignedTo?: string[];
        resources?: any[];
      };
    },
    userId: string,
    organizationId: string
  ) {
    const template = await this.getTemplate(templateId, organizationId);
    
    // Create activity using template data
    const activityData = {
      farmId: data.farmId,
      areaId: data.areaId,
      cropCycleId: data.cropCycleId,
      userId,
      type: template.type,
      name: data.customizations?.name || template.name,
      description: template.description,
      scheduledAt: new Date(data.scheduledAt),
      status: 'PLANNED' as const,
      metadata: {
        instructions: template.instructions,
        safetyNotes: template.safetyNotes,
        templateId: template.id,
        estimatedDuration: template.defaultDuration,
        resources: data.customizations?.resources || [],
      },
    };

    const activity = await this.prisma.farmActivity.create({
      data: activityData,
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: activity.id,
      type: 'activities' as const,
      attributes: {
        id: activity.id,
        farmId: activity.farmId,
        areaId: activity.areaId,
        cropCycleId: activity.cropCycleId,
        type: activity.type,
        name: activity.name,
        description: activity.description,
        status: activity.status,
        scheduledAt: activity.scheduledAt?.toISOString() || null,
        completedAt: activity.completedAt?.toISOString() || null,
        cost: activity.cost,
        userId: activity.userId,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
        updatedAt: activity.updatedAt.toISOString(),
        farm: activity.farm,
        area: activity.area,
        user: activity.user,
      },
    };
  }

  private formatTemplateResponse(template: any): ActivityTemplate {
    return {
      id: template.id,
      name: template.name,
      type: template.type,
      description: template.description,
      defaultDuration: template.defaultDuration,
      instructions: template.instructions,
      safetyNotes: template.safetyNotes,
      applicableCrops: template.applicableCrops,
      isSystem: template.isSystem,
      organizationId: template.organizationId,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
