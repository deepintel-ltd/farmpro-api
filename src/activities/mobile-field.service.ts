import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from './weather.service';

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
  status: string;
  priority: string;
  scheduledAt?: Date;
  farm: {
    id: string;
    name: string;
  };
  assignments: Array<{
    user: {
      id: string;
      name: string;
    };
  }>;
}

interface MobileTaskDetails extends MobileTask {
  notes: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: Date;
    user: { name: string };
  }>;
}

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
        farm: { select: { id: true, name: true } },
        assignments: {
          where: { userId, isActive: true },
          include: { user: { select: { id: true, name: true } } }
        },
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
      status: task.status,
      priority: task.priority,
      scheduledAt: task.scheduledAt,
      farm: task.farm,
      assignments: task.assignments,
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
        farm: { select: { id: true, name: true } },
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true } } }
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { name: true } } }
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
      status: task.status,
      priority: task.priority,
      scheduledAt: task.scheduledAt,
      farm: task.farm,
      assignments: task.assignments,
      notes: task.notes,
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
        metadata: gpsCoordinates ? { gpsCoordinates } : undefined,
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
}