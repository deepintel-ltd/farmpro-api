import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAssignmentService } from './activity-assignment.service';

export interface HelpRequestData {
  message: string;
  skillsNeeded?: string[];
  urgency?: 'low' | 'normal' | 'high';
}

@Injectable()
export class ActivityHelpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentService: ActivityAssignmentService,
  ) {}

  async requestHelp(
    activityId: string,
    helpData: HelpRequestData,
    userId: string,
    organizationId: string
  ) {
    // Verify activity exists and user is assigned
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
      include: {
        farm: { select: { id: true, name: true } },
        assignments: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check if user is assigned to this activity
    const isAssigned = await this.assignmentService.checkAssignment(userId, activityId, organizationId);
    if (!isAssigned) {
      throw new ForbiddenException('Not authorized to request help for this activity');
    }

    // Store help request in activity metadata
    const currentMetadata = (activity.metadata as any) || {};
    const helpRequests = currentMetadata.helpRequests || [];
    
    const newHelpRequest = {
      id: `help-${Date.now()}`,
      requestedBy: userId,
      requestedAt: new Date().toISOString(),
      message: helpData.message,
      skillsNeeded: helpData.skillsNeeded || [],
      urgency: helpData.urgency || 'normal',
      status: 'pending',
    };

    helpRequests.push(newHelpRequest);

    await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        metadata: {
          ...currentMetadata,
          helpRequests,
        },
      },
    });

    // TODO: In a full implementation, this would trigger notifications
    // to farm managers or other team members
    
    return {
      data: {
        id: newHelpRequest.id,
        type: 'help-requests' as const,
        attributes: {
          id: newHelpRequest.id,
          activityId,
          activityName: activity.name,
          message: helpData.message,
          skillsNeeded: helpData.skillsNeeded,
          urgency: helpData.urgency,
          requestedAt: newHelpRequest.requestedAt,
          status: 'pending',
        },
      },
    };
  }

  async getHelpRequests(activityId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const helpRequests = ((activity.metadata as any)?.helpRequests || []).map((request: any) => ({
      id: request.id,
      type: 'help-requests' as const,
      attributes: {
        id: request.id,
        activityId,
        message: request.message,
        skillsNeeded: request.skillsNeeded,
        urgency: request.urgency,
        requestedAt: request.requestedAt,
        requestedBy: request.requestedBy,
        status: request.status,
      },
    }));

    return {
      data: helpRequests,
      meta: {
        totalRequests: helpRequests.length,
        pendingRequests: helpRequests.filter((r: any) => r.attributes.status === 'pending').length,
      },
    };
  }
}