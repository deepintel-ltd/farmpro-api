import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityRole } from '@prisma/client';

export interface AssignmentData {
  userId: string;
  role?: ActivityRole;
}

@Injectable()
export class ActivityAssignmentService {
  private readonly logger = new Logger(ActivityAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assignUsers(
    activityId: string,
    assignments: AssignmentData[],
    assignedById: string,
    organizationId: string,
    options: {
      reassignReason?: string;
      notifyUsers?: boolean;
    } = {}
  ) {
    this.logger.log('Assigning users to activity', {
      activityId,
      assignedById,
      organizationId,
      userCount: assignments.length,
      userIds: assignments.map(a => a.userId),
      roles: assignments.map(a => a.role || 'ASSIGNED'),
      reassignReason: options.reassignReason
    });

    // Verify activity exists and belongs to organization
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
      include: {
        assignments: {
          where: { isActive: true }
        }
      }
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.status === 'COMPLETED' || activity.status === 'CANCELLED') {
      throw new BadRequestException('Cannot assign users to completed or cancelled activity');
    }

    // Verify all users exist and belong to organization
    const userIds = assignments.map(a => a.userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId,
        isActive: true,
      },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('Some users not found or inactive');
    }

    const results = await this.prisma.$transaction(async (tx) => {
      // Deactivate existing assignments
      await tx.activityAssignment.updateMany({
        where: {
          activityId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Create new assignments
      const newAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          return tx.activityAssignment.create({
            data: {
              activityId,
              userId: assignment.userId,
              role: assignment.role || ActivityRole.ASSIGNED,
              assignedById,
              isActive: true,
              metadata: options.reassignReason ? {
                reassignReason: options.reassignReason,
                reassignedAt: new Date().toISOString(),
              } : undefined,
            },
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          });
        })
      );

      // Note: Assignment count and primary user are handled through the ActivityAssignment model
      // No direct fields on FarmActivity need to be updated

      return newAssignments;
    });

    return {
      data: results.map(assignment => ({
        id: assignment.id,
        type: 'activity-assignments' as const,
        attributes: {
          id: assignment.id,
          activityId: assignment.activityId,
          userId: assignment.userId,
          role: assignment.role,
          assignedAt: assignment.assignedAt.toISOString(),
          user: assignment.user,
        },
      })),
    };
  }

  async getActivityAssignments(activityId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const assignments = await this.prisma.activityAssignment.findMany({
      where: {
        activityId,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: {
        assignedAt: 'asc'
      }
    });

    return {
      data: assignments.map(assignment => ({
        id: assignment.id,
        type: 'activity-assignments' as const,
        attributes: {
          id: assignment.id,
          activityId: assignment.activityId,
          userId: assignment.userId,
          role: assignment.role,
          assignedAt: assignment.assignedAt.toISOString(),
          user: assignment.user,
          assignedBy: assignment.assignedBy,
        },
      })),
    };
  }

  async checkAssignment(activityId: string, userId: string, organizationId: string): Promise<boolean> {
    const where: any = {
      activityId,
      userId,
      isActive: true,
      activity: {
        farm: {
          organizationId
        }
      }
    };

    const assignment = await this.prisma.activityAssignment.findFirst({
      where,
      include: {
        activity: {
          select: {
            farm: {
              select: {
                organizationId: true
              }
            }
          }
        }
      }
    });

    return !!assignment;
  }

  async removeAssignment(activityId: string, userId: string, organizationId: string) {
    const activity = await this.prisma.farmActivity.findFirst({
      where: {
        id: activityId,
        farm: { organizationId },
      },
      include: {
        assignments: {
          where: { isActive: true }
        }
      }
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.assignments.length <= 1) {
      throw new BadRequestException('Cannot remove last assignment from activity');
    }

    await this.prisma.activityAssignment.updateMany({
      where: {
        activityId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Note: Assignment count is handled through the ActivityAssignment model
    // No direct fields on FarmActivity need to be updated
  }

  async getUserActivities(userId: string, organizationId: string, filters: {
    status?: string;
    farmId?: string;
    priority?: string;
    limit?: number;
  } = {}) {
    const where: any = {
      userId,
      isActive: true,
      activity: {
        farm: { organizationId },
      },
    };

    if (filters.status) {
      where.activity.status = filters.status;
    }
    
    if (filters.farmId) {
      where.activity.farmId = filters.farmId;
    }

    if (filters.priority) {
      where.activity.priority = filters.priority;
    }

    const assignments = await this.prisma.activityAssignment.findMany({
      where,
      include: {
        activity: {
          include: {
            farm: { select: { id: true, name: true } },
            area: { select: { id: true, name: true } },
          }
        }
      },
      orderBy: {
        activity: {
          scheduledAt: 'asc'
        }
      },
      take: filters.limit || 50,
    });

    return {
      data: assignments.map(assignment => ({
        id: assignment.activity.id,
        type: 'activities' as const,
        attributes: {
          ...assignment.activity,
          role: assignment.role,
          assignedAt: assignment.assignedAt.toISOString(),
          scheduledAt: assignment.activity.scheduledAt?.toISOString() || null,
          completedAt: assignment.activity.completedAt?.toISOString() || null,
          startedAt: assignment.activity.startedAt?.toISOString() || null,
          createdAt: assignment.activity.createdAt.toISOString(),
          updatedAt: assignment.activity.updatedAt.toISOString(),
        },
      })),
    };
  }
}
