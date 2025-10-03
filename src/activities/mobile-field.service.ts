import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';

// Simplified mobile interfaces
interface MobileTaskQuery {
  status?: string;
  priority?: string;
  farmId?: string;
  limit?: number;
}

interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

interface TaskActionData {
  notes?: string;
  gpsCoordinates?: GPSCoordinates;
  progress?: number;
  actualCost?: number;
}

interface MobileTask {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  progress: number;
  scheduledAt?: string;
  estimatedDuration?: number;
  farm: {
    id: string;
    name: string;
    location?: string;
  };
  area?: {
    id: string;
    name: string;
    boundaries?: any;
  };
  notes: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
    };
  }>;
  assignments: Array<{
    id: string;
    user: {
      id: string;
      name: string;
    };
  }>;
  metadata?: any;
}

type MobileTaskDetails = MobileTask;

@Injectable()
export class MobileFieldService {
  private readonly logger = new Logger(MobileFieldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
  ) {}

  async getMyTasks(userId: string, organizationId: string, query: MobileTaskQuery): Promise<MobileTask[]> {
    this.logger.log(`Getting mobile tasks for user: ${userId}`);

    const where: any = {
      farm: { organizationId },
      assignments: {
        some: { userId, isActive: true },
      },
    };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.farmId) where.farmId = query.farmId;

    const tasks = await this.prisma.farmActivity.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true, location: true } },
        area: { select: { id: true, name: true, boundaries: true } },
        assignments: {
          where: { userId, isActive: true },
          include: { user: { select: { id: true, name: true } } }
        },
        notes: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledAt: 'asc' },
      ],
      take: query.limit || 50,
    });

    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      type: task.type,
      status: task.status === 'PAUSED' ? 'IN_PROGRESS' : task.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
      priority: task.priority,
      progress: 0, // TODO: Calculate from progress logs
      scheduledAt: task.scheduledAt?.toISOString(),
      estimatedDuration: task.estimatedDuration,
      farm: {
        ...task.farm,
        location: typeof task.farm.location === 'string' ? task.farm.location : undefined
      },
      area: task.area,
      notes: task.notes.map(note => ({
        id: note.id,
        type: note.type,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        user: {
          id: note.user.id,
          name: note.user.name
        }
      })),
      assignments: task.assignments.map(assignment => ({
        id: assignment.id,
        user: assignment.user
      })),
      metadata: task.metadata,
    }));
  }

  async getTaskDetails(taskId: string, userId: string, organizationId: string): Promise<MobileTaskDetails> {
    this.logger.log(`Getting task details for: ${taskId}`);

    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: { userId, isActive: true },
        },
      },
      include: {
        farm: { select: { id: true, name: true, location: true } },
        area: { select: { id: true, name: true, boundaries: true } },
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true } } }
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { id: true, name: true } } }
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    return {
      id: task.id,
      name: task.name,
      description: task.description,
      type: task.type,
      status: task.status === 'PAUSED' ? 'IN_PROGRESS' : task.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
      priority: task.priority,
      progress: 0, // TODO: Calculate from progress logs
      scheduledAt: task.scheduledAt?.toISOString(),
      estimatedDuration: task.estimatedDuration,
      farm: {
        ...task.farm,
        location: typeof task.farm.location === 'string' ? task.farm.location : undefined
      },
      area: task.area,
      notes: task.notes.map(note => ({
        id: note.id,
        type: note.type,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        user: {
          id: note.user.id,
          name: note.user.name
        }
      })),
      assignments: task.assignments.map(assignment => ({
        id: assignment.id,
        user: assignment.user
      })),
      metadata: task.metadata,
    };
  }

  async updateTaskProgress(
    taskId: string, 
    data: TaskActionData, 
    userId: string, 
    organizationId: string
  ): Promise<void> {
    this.logger.log(`Updating task progress: ${taskId}`);

    // Verify user has access to task
    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: { userId, isActive: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Update progress
    if (data.progress !== undefined) {
      await this.prisma.activityProgressLog.create({
        data: {
          activityId: taskId,
          userId,
          percentComplete: data.progress,
          notes: data.notes,
          location: data.gpsCoordinates ? JSON.stringify(data.gpsCoordinates) : undefined,
        },
      });
    }

    // Add note if provided
    if (data.notes) {
      await this.prisma.activityNote.create({
        data: {
          activityId: taskId,
          userId,
          content: data.notes,
          type: 'GENERAL',
        },
      });
    }
  }

  async addTaskNote(
    taskId: string,
    content: string,
    userId: string,
    organizationId: string,
    gpsCoordinates?: GPSCoordinates
  ): Promise<void> {
    this.logger.log(`Adding note to task: ${taskId}`);

    // Verify user has access to task
    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: { userId, isActive: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    await this.prisma.activityNote.create({
      data: {
        activityId: taskId,
        userId,
        content,
        type: 'GENERAL',
        metadata: gpsCoordinates ? { gpsCoordinates: gpsCoordinates as any } : undefined,
      },
    });
  }

  async getFieldConditions(latitude: number, longitude: number) {
    try {
      return await this.weatherService.getFieldConditions(latitude, longitude);
    } catch (error) {
      this.logger.error(`Failed to get field conditions: ${error.message}`);
      return {
        weather: {
          temperature: 20,
          humidity: 60,
          windSpeed: 5,
          conditions: 'Unknown',
          isGoodForFieldWork: true,
        },
        recommendations: ['Weather service unavailable - proceed with caution'],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async startTask(taskId: string, data: TaskActionData, userId: string, organizationId: string) {
    this.logger.log(`Starting task ${taskId} for user ${userId}`);
    
    // Check if task exists and user has access
    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: { userId, isActive: true }
        }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Update task status to IN_PROGRESS
    const updatedTask = await this.prisma.farmActivity.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        metadata: {
          ...(task.metadata as Record<string, any> || {}),
          gpsCoordinates: data.gpsCoordinates as any,
          startedBy: userId,
          startedAt: new Date().toISOString(),
        }
      },
      include: {
        farm: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    });

    return {
      id: updatedTask.id,
      name: updatedTask.name,
      status: updatedTask.status,
      startedAt: updatedTask.startedAt,
      message: 'Task started successfully'
    };
  }

  async completeTask(taskId: string, data: TaskActionData, userId: string, organizationId: string) {
    this.logger.log(`Completing task ${taskId} for user ${userId}`);
    
    // Check if task exists and user has access
    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: { userId, isActive: true }
        }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Update task status to COMPLETED
    const updatedTask = await this.prisma.farmActivity.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        actualDuration: data.progress ? Math.round(data.progress * (task.estimatedDuration || 0)) : undefined,
        metadata: {
          ...(task.metadata as Record<string, any> || {}),
          gpsCoordinates: data.gpsCoordinates as any,
          completedBy: userId,
          completedAt: new Date().toISOString(),
          actualCost: data.actualCost,
        }
      },
      include: {
        farm: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    });

    return {
      id: updatedTask.id,
      name: updatedTask.name,
      status: updatedTask.status,
      completedAt: updatedTask.completedAt,
      message: 'Task completed successfully'
    };
  }

  async addTaskPhoto(taskId: string, data: any, userId: string, organizationId: string) {
    this.logger.log(`Adding photo to task ${taskId} for user ${userId}`);
    
    // Check if task exists and user has access
    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: { userId, isActive: true }
        }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Add photo to task notes
    const note = await this.prisma.activityNote.create({
      data: {
        activityId: taskId,
        userId,
        type: 'GENERAL',
        content: data.photoUrl || 'Photo uploaded',
        metadata: {
          photoUrl: data.photoUrl,
          gpsCoordinates: data.gpsCoordinates,
          uploadedAt: new Date().toISOString(),
        }
      }
    });

    return {
      id: note.id,
      type: 'PHOTO',
      content: note.content,
      createdAt: note.createdAt,
      message: 'Photo added successfully'
    };
  }

  async getOfflineData(userId: string, organizationId: string) {
    this.logger.log(`Getting offline data for user ${userId}`);
    
    // Get user's assigned tasks
    const tasks = await this.prisma.farmActivity.findMany({
      where: {
        farm: { organizationId },
        assignments: {
          some: { userId, isActive: true }
        },
        status: { in: ['PLANNED', 'IN_PROGRESS'] }
      },
      include: {
        farm: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    });

    return {
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        type: task.type,
        status: task.status,
        priority: task.priority,
        scheduledAt: task.scheduledAt?.toISOString(),
        farm: task.farm,
        assignments: task.assignments
      })),
      lastSync: new Date().toISOString(),
      totalTasks: tasks.length
    };
  }

  async syncOfflineData(data: any, userId: string) {
    this.logger.log(`Syncing offline data for user ${userId}`);
    
    // Process offline task updates
    const results = {
      synced: 0,
      failed: 0,
      errors: []
    };

    if (data.taskUpdates) {
      for (const update of data.taskUpdates) {
        try {
          await this.prisma.farmActivity.update({
            where: { id: update.taskId },
            data: {
              status: update.status,
              metadata: {
                ...update.metadata,
                syncedAt: new Date().toISOString(),
                syncedBy: userId
              }
            }
          });
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            taskId: update.taskId,
            error: error.message
          });
        }
      }
    }

    return {
      synced: results.synced,
      failed: results.failed,
      errors: results.errors,
      syncedAt: new Date().toISOString()
    };
  }

  async reportIssue(data: any, userId: string) {
    this.logger.log(`Reporting issue for user ${userId}`);
    
    // Create issue report
    const issue = await this.prisma.activityNote.create({
      data: {
        activityId: data.taskId,
        userId,
        type: 'ISSUE',
        content: data.description,
        metadata: {
          issueType: data.type,
          severity: data.severity || 'MEDIUM',
          gpsCoordinates: data.gpsCoordinates,
          reportedAt: new Date().toISOString(),
          attachments: data.attachments || []
        }
      }
    });

    return {
      id: issue.id,
      type: 'ISSUE',
      content: issue.content,
      createdAt: issue.createdAt,
      message: 'Issue reported successfully'
    };
  }
}
