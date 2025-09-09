import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityRole } from '@prisma/client';

export interface AssignmentData {
  userId: string;
  role?: ActivityRole;
}

@Injectable()
export class ActivityAssignmentService {
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

      // Update activity assignment count and primary assigned user
      const primaryUser = assignments[0];
      await tx.farmActivity.update({
        where: { id: activityId },
        data: {
          userId: primaryUser.userId, // Keep backward compatibility
          assignmentCount: assignments.length,
        },
      });

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

  async checkAssignment(activityId: string, userId: string): Promise<boolean> {
    const assignment = await this.prisma.activityAssignment.findFirst({
      where: {
        activityId,
        userId,
        isActive: true,
      },
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

    // Update assignment count
    await this.prisma.farmActivity.update({
      where: { id: activityId },
      data: {
        assignmentCount: activity.assignments.length - 1,
      },
    });
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