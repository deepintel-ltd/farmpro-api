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
  name?: string;
  farmId: string;
  areaId?: string;
  cropCycleId?: string;
  scheduledAt: string;
  priority?: string;
  assignedTo?: string[];
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
    search?: string;
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

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
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
        name: data.name || data.customizations?.name || template.attributes.name,
        description: template.attributes.description,
        priority: data.priority as any || 'NORMAL',
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
    const assignedUsers = data.assignedTo || data.customizations?.assignedTo || [];
    if (assignedUsers.length) {
      await Promise.all(
        assignedUsers.map(assignedUserId =>
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

    // Fetch the full activity with relations for complete response
    const fullActivity = await this.prisma.farmActivity.findUnique({
      where: { id: activity.id },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true } } }
        },
      },
    });

    if (!fullActivity) {
      throw new NotFoundException('Activity not found after creation');
    }

    return {
      id: fullActivity.id,
      type: 'activities' as const,
      attributes: this.formatActivityResponse(fullActivity),
    };
  }

  private formatActivityResponse(activity: any) {
    return {
      id: activity.id,
      farmId: activity.farmId,
      areaId: activity.areaId,
      cropCycleId: activity.cropCycleId,
      type: activity.type,
      name: activity.name,
      description: activity.description,
      status: activity.status,
      priority: activity.priority,
      scheduledAt: activity.scheduledAt?.toISOString() || null,
      completedAt: activity.completedAt?.toISOString() || null,
      startedAt: activity.startedAt?.toISOString() || null,
      estimatedDuration: activity.estimatedDuration,
      actualDuration: activity.actualDuration,
      percentComplete: (activity.metadata?.percentComplete as number) || 0,
      assignedTo: activity.assignments?.map((assignment: any) => assignment.userId) || [],
      resources: activity.metadata?.resources || [],
      actualResources: activity.metadata?.actualResources || [],
      instructions: activity.metadata?.instructions || '',
      safetyNotes: activity.metadata?.safetyNotes || '',
      estimatedCost: activity.metadata?.estimatedCost || 0,
      actualCost: activity.cost || activity.metadata?.actualCost || null,
      location: activity.metadata?.location || null,
      results: activity.metadata?.results || null,
      issues: activity.metadata?.issues || null,
      recommendations: activity.metadata?.recommendations || null,
      metadata: activity.metadata,
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      createdBy: activity.createdById,
    };
  }
}
