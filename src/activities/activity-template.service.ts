import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTemplateDto {
  name: string;
  type: string;
  description: string;
  defaultDuration: number;
  instructions: string;
  safetyNotes: string;
  applicableCrops?: string[];
  metadata?: any;
}

export interface CreateFromTemplateDto {
  farmId: string;
  areaId?: string;
  cropCycleId?: string;
  scheduledAt: string;
  customizations?: {
    name?: string;
    assignedTo?: string[];
    resources?: any[];
  };
}

@Injectable()
export class ActivityTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(organizationId: string, filters: {
    type?: string;
    cropType?: string;
    farmType?: string;
  } = {}) {
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
        hasSome: [filters.cropType],
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
      data: templates.map(template => ({
        id: template.id,
        type: 'activity-templates' as const,
        attributes: {
          id: template.id,
          name: template.name,
          type: template.type as any,
          description: template.description,
          defaultDuration: template.defaultDuration,
          instructions: template.instructions,
          safetyNotes: template.safetyNotes,
          applicableCrops: template.applicableCrops || [],
          isSystem: template.isSystem,
          organizationId: template.organizationId,
          metadata: template.metadata,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        },
      })),
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
      throw new NotFoundException('Template not found');
    }

    return {
      id: template.id,
      type: 'activity-templates' as const,
      attributes: {
        id: template.id,
        name: template.name,
        type: template.type as any,
        description: template.description,
        defaultDuration: template.defaultDuration,
        instructions: template.instructions,
        safetyNotes: template.safetyNotes,
        applicableCrops: template.applicableCrops || [],
        isSystem: template.isSystem,
        organizationId: template.organizationId,
        metadata: template.metadata,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    };
  }

  async createTemplate(data: CreateTemplateDto, organizationId: string) {
    const template = await this.prisma.activityTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        defaultDuration: data.defaultDuration,
        instructions: data.instructions,
        safetyNotes: data.safetyNotes,
        applicableCrops: data.applicableCrops || [],
        organizationId,
        metadata: data.metadata,
      },
    });

    return {
      id: template.id,
      type: 'activity-templates' as const,
      attributes: {
        id: template.id,
        name: template.name,
        type: template.type as any,
        description: template.description,
        defaultDuration: template.defaultDuration,
        instructions: template.instructions,
        safetyNotes: template.safetyNotes,
        applicableCrops: template.applicableCrops,
        isSystem: template.isSystem,
        metadata: template.metadata,
        createdAt: template.createdAt.toISOString(),
      },
    };
  }

  async createFromTemplate(
    templateId: string,
    data: CreateFromTemplateDto,
    userId: string,
    organizationId: string
  ) {
    const template = await this.getTemplate(templateId, organizationId);

    // Verify farm belongs to organization
    const farm = await this.prisma.farm.findFirst({
      where: { id: data.farmId, organizationId },
    });

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    const activity = await this.prisma.farmActivity.create({
      data: {
        farmId: data.farmId,
        areaId: data.areaId,
        cropCycleId: data.cropCycleId,
        type: template.attributes.type as any,
        name: data.customizations?.name || template.attributes.name,
        description: template.attributes.description,
        scheduledAt: new Date(data.scheduledAt),
        estimatedDuration: template.attributes.defaultDuration,
        createdById: userId,
        metadata: {
          templateId,
          instructions: template.attributes.instructions,
          safetyNotes: template.attributes.safetyNotes,
          customizations: data.customizations,
        },
      },
    });

    // Create assignments if specified
    if (data.customizations?.assignedTo?.length) {
      await Promise.all(
        data.customizations.assignedTo.map(assignedUserId =>
          this.prisma.activityAssignment.create({
            data: {
              activityId: activity.id,
              userId: assignedUserId,
              role: 'ASSIGNED',
              assignedById: userId,
              isActive: true,
            },
          })
        )
      );
    }

    return {
      id: activity.id,
      type: 'activities' as const,
      attributes: {
        id: activity.id,
        name: activity.name,
        type: activity.type,
        status: activity.status,
        scheduledAt: activity.scheduledAt?.toISOString(),
        templateId,
        createdAt: activity.createdAt.toISOString(),
      },
    };
  }
}
