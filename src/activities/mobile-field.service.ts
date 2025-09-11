import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAssignmentService } from './activity-assignment.service';
import { ActivityUpdatesGateway } from './activity-updates.gateway';

// Type definitions for mobile field operations
interface MobileTaskQuery {
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  farmId?: string;
  limit?: number;
}

interface StartTaskData {
  location?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

interface UpdateProgressData {
  progress: number;
  notes?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

interface CompleteTaskData {
  completedAt?: string;
  actualCost?: number;
  notes?: string;
  results?: string;
  issues?: string;
  recommendations?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

interface AddNoteData {
  type?: 'OBSERVATION' | 'ISSUE' | 'RECOMMENDATION' | 'GENERAL';
  content: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  photos?: string[];
}

interface AddPhotoData {
  mediaId: string;
  url: string;
  caption?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}


interface SyncOfflineData {
  taskUpdates?: Array<{
    taskId: string;
    progress?: number;
    status?: string;
    metadata?: Record<string, any>;
  }>;
  notes?: Array<{
    taskId: string;
    type: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
}

interface ReportIssueData {
  taskId: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  category?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  photos?: string[];
}

interface MobileTask {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  progress: number;
  scheduledAt?: Date;
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
  cropCycle?: {
    id: string;
    commodity: {
      id: string;
      name: string;
      category: string;
    };
  };
  assignments: Array<{
    id: string;
    user: {
      id: string;
      name: string;
    };
  }>;
  notes: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      name: string;
    };
  }>;
  metadata?: any;
}

interface MobileTaskDetails extends MobileTask {
  costs: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: Date;
    user: {
      id: string;
      name: string;
    };
  }>;
  allNotes: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      name: string;
    };
  }>;
}

interface OfflineData {
  tasks: MobileTask[];
  farms: Array<{
    id: string;
    name: string;
    location?: string;
    totalArea?: number;
  }>;
  areas: Array<{
    id: string;
    name: string;
    boundaries?: any;
    farmId: string;
  }>;
  lastSync: string;
}

interface FieldConditions {
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    conditions: string;
    forecast: string;
  };
  soil: {
    moisture: number;
    ph: number;
    temperature: number;
    conditions: string;
  };
  recommendations: string[];
  lastUpdated: string;
}

interface SyncResults {
  tasksUpdated: number;
  notesAdded: number;
  errors: string[];
}



@Injectable()
export class MobileFieldService {
  private readonly logger = new Logger(MobileFieldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentService: ActivityAssignmentService,
    private readonly activityUpdatesGateway: ActivityUpdatesGateway,
  ) {}

  async getMyTasks(userId: string, organizationId: string, query: MobileTaskQuery): Promise<MobileTask[]> {
    this.logger.log(`Getting mobile tasks for user: ${userId}`);

    const where: any = {
      farm: { organizationId },
      assignments: {
        some: {
          userId,
          isActive: true,
        },
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
        cropCycle: {
          include: {
            commodity: { select: { id: true, name: true, category: true } }
          }
        },
        assignments: {
          where: { userId, isActive: true },
          include: { user: { select: { id: true, name: true } } }
        },
        notes: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledAt: 'asc' },
      ],
      take: query.limit || 50,
    });

    return tasks.map(task => this.formatMobileTask(task));
  }

  async getTaskDetails(taskId: string, userId: string, organizationId: string): Promise<MobileTaskDetails> {
    this.logger.log(`Getting task details for: ${taskId}`);

    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        farm: { select: { id: true, name: true, location: true } },
        area: { select: { id: true, name: true, boundaries: true } },
        cropCycle: {
          include: {
            commodity: { select: { id: true, name: true, category: true } }
          }
        },
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } }
        },
        costs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    return this.formatMobileTaskDetails(task);
  }

  async startTask(taskId: string, data: StartTaskData, userId: string, organizationId: string): Promise<MobileTask> {
    this.logger.log(`Starting task: ${taskId}`);

    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Check if user is assigned to this task
    const isAssigned = await this.assignmentService.checkAssignment(taskId, userId, organizationId);
    if (!isAssigned) {
      throw new BadRequestException('Not assigned to this task');
    }

    // Validate state transition
    if (task.status !== 'PLANNED') {
      throw new BadRequestException(`Cannot start task in ${task.status} status`);
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        metadata: {
          ...(task.metadata as object || {}),
          startedAt: new Date().toISOString(),
          location: data.location,
          gpsCoordinates: data.gpsCoordinates,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
      },
    });

    // Broadcast task started via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(taskId, {
      type: 'task_started',
      task: this.formatMobileTask(updated),
      startedBy: userId,
      location: data.location,
    });

    return this.formatMobileTask(updated);
  }

  async updateTaskProgress(taskId: string, data: UpdateProgressData, userId: string, organizationId: string): Promise<MobileTask> {
    this.logger.log(`Updating task progress: ${taskId}`);

    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Check if user is assigned to this task
    const isAssigned = await this.assignmentService.checkAssignment(taskId, userId, organizationId);
    if (!isAssigned) {
      throw new BadRequestException('Not assigned to this task');
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot update progress for task in ${task.status} status`);
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: taskId },
      data: {
        metadata: {
          ...(task.metadata as object || {}),
          lastProgressUpdate: new Date().toISOString(),
          progressNotes: data.notes,
          progress: data.progress,
          gpsCoordinates: data.gpsCoordinates,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
      },
    });

    // Broadcast progress update via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(taskId, {
      type: 'task_progress_updated',
      task: this.formatMobileTask(updated),
      updatedBy: userId,
      progress: data.progress,
      notes: data.notes,
    });

    return this.formatMobileTask(updated);
  }

  async completeTask(taskId: string, data: CompleteTaskData, userId: string, organizationId: string): Promise<MobileTask> {
    this.logger.log(`Completing task: ${taskId}`);

    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        farm: { select: { organizationId: true } }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Check if user is assigned to this task
    const isAssigned = await this.assignmentService.checkAssignment(taskId, userId, organizationId);
    if (!isAssigned) {
      throw new BadRequestException('Not assigned to this task');
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot complete task in ${task.status} status`);
    }

    const updated = await this.prisma.farmActivity.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(data.completedAt || new Date()),
        cost: data.actualCost || 0,
        metadata: {
          ...(task.metadata as object || {}),
          completedAt: new Date().toISOString(),
          completionNotes: data.notes,
          results: data.results,
          issues: data.issues,
          recommendations: data.recommendations,
          progress: 100,
          gpsCoordinates: data.gpsCoordinates,
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
      },
    });

    // Broadcast task completed via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(taskId, {
      type: 'task_completed',
      task: this.formatMobileTask(updated),
      completedBy: userId,
      results: data.results,
      issues: data.issues,
    });

    return this.formatMobileTask(updated);
  }

  async addTaskNote(taskId: string, data: AddNoteData, userId: string, organizationId: string): Promise<{
    id: string;
    type: string;
    content: string;
    createdAt: Date;
    user: { id: string; name: string };
  }> {
    this.logger.log(`Adding note to task: ${taskId}`);

    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    const note = await this.prisma.activityNote.create({
      data: {
        activityId: taskId,
        userId,
        type: data.type || 'GENERAL',
        content: data.content,
        metadata: {
          gpsCoordinates: data.gpsCoordinates,
          photos: data.photos || [],
        },
      },
      include: {
        user: { select: { id: true, name: true } }
      },
    });

    // Broadcast note added via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(taskId, {
      type: 'task_note_added',
      taskId,
      note: {
        id: note.id,
        type: note.type,
        content: note.content,
        createdAt: note.createdAt,
        user: note.user,
      },
      addedBy: userId,
    });

    return {
      id: note.id,
      type: note.type,
      content: note.content,
      createdAt: note.createdAt,
      user: note.user,
    };
  }

  async addTaskPhoto(taskId: string, data: AddPhotoData, userId: string, organizationId: string): Promise<{
    mediaId: string;
    url: string;
    caption?: string;
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    addedAt: string;
  }> {
    this.logger.log(`Adding photo reference to task: ${taskId}`);

    const task = await this.prisma.farmActivity.findFirst({
      where: {
        id: taskId,
        farm: { organizationId },
        assignments: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }

    // Validate that the media ID exists and belongs to this activity
    const media = await this.prisma.media.findFirst({
      where: {
        id: data.mediaId,
        farmActivityId: taskId,
      },
    });

    if (!media) {
      throw new BadRequestException('Media not found or does not belong to this activity');
    }

    // Add photo reference to task metadata
    await this.prisma.farmActivity.update({
      where: { id: taskId },
      data: {
        metadata: {
          ...(task.metadata as object || {}),
          photos: [
            ...((task.metadata as any)?.photos || []),
            {
              mediaId: data.mediaId,
              url: data.url,
              caption: data.caption,
              gpsCoordinates: data.gpsCoordinates,
              addedAt: new Date().toISOString(),
            },
          ],
        },
      },
    });

    // Broadcast photo added via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(taskId, {
      type: 'task_photo_added',
      taskId,
      photo: {
        mediaId: data.mediaId,
        url: data.url,
        caption: data.caption,
        gpsCoordinates: data.gpsCoordinates,
        addedAt: new Date().toISOString(),
      },
      addedBy: userId,
    });

    return {
      mediaId: data.mediaId,
      url: data.url,
      caption: data.caption,
      gpsCoordinates: data.gpsCoordinates,
      addedAt: new Date().toISOString(),
    };
  }

  async getOfflineData(userId: string, organizationId: string): Promise<OfflineData> {
    this.logger.log(`Getting offline data for user: ${userId}`);

    // Get tasks assigned to user
    const tasks = await this.prisma.farmActivity.findMany({
      where: {
        farm: { organizationId },
        assignments: {
          some: {
            userId,
            isActive: true,
          },
        },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      include: {
        farm: { select: { id: true, name: true, location: true } },
        area: { select: { id: true, name: true, boundaries: true } },
        cropCycle: {
          include: {
            commodity: { select: { id: true, name: true, category: true } }
          }
        },
        notes: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Get farm and area data
    const farms = await this.prisma.farm.findMany({
      where: { organizationId },
      select: { id: true, name: true, location: true, totalArea: true },
    });

    const areas = await this.prisma.area.findMany({
      where: {
        farm: { organizationId },
      },
      select: { id: true, name: true, boundaries: true, farmId: true },
    });

    return {
      tasks: tasks.map(task => this.formatMobileTask(task)),
      farms: farms.map(farm => ({
        id: farm.id,
        name: farm.name,
        location: typeof farm.location === 'string' ? farm.location : undefined,
        totalArea: farm.totalArea,
      })),
      areas,
      lastSync: new Date().toISOString(),
    };
  }

  async syncOfflineData(data: SyncOfflineData, userId: string): Promise<SyncResults> {
    this.logger.log(`Syncing offline data for user: ${userId}`);

    const results = {
      tasksUpdated: 0,
      notesAdded: 0,
      errors: [],
    };

    try {
      // Sync task updates
      if (data.taskUpdates) {
        for (const update of data.taskUpdates) {
          try {
            await this.prisma.farmActivity.update({
              where: { id: update.taskId },
              data: {
                status: update.status as any,
                metadata: {
                  ...update.metadata,
                  progress: update.progress,
                  lastOfflineSync: new Date().toISOString(),
                },
              },
            });
            results.tasksUpdated++;
          } catch (error) {
            results.errors.push(`Failed to update task ${update.taskId}: ${error.message}`);
          }
        }
      }

      // Sync notes
      if (data.notes) {
        for (const note of data.notes) {
          try {
            await this.prisma.activityNote.create({
              data: {
                activityId: note.taskId,
                userId,
                type: note.type as any,
                content: note.content,
                metadata: note.metadata,
              },
            });
            results.notesAdded++;
          } catch (error) {
            results.errors.push(`Failed to add note: ${error.message}`);
          }
        }
      }


      return results;
    } catch (error) {
      this.logger.error('Error syncing offline data:', error);
      throw new BadRequestException('Failed to sync offline data');
    }
  }

  async getFieldConditions(userId: string): Promise<FieldConditions> {
    this.logger.log(`Getting field conditions for user: ${userId}`);

    // This would typically integrate with weather APIs and IoT sensors
    // For now, we'll return mock data
    return {
      weather: {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        conditions: 'Sunny',
        forecast: 'Clear skies for the next 3 days',
      },
      soil: {
        moisture: 45,
        ph: 6.8,
        temperature: 22,
        conditions: 'Good',
      },
      recommendations: [
        'Ideal conditions for planting',
        'Consider irrigation in 2 days',
        'Monitor for pest activity',
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  async reportIssue(data: ReportIssueData, userId: string): Promise<{
    id: string;
    description: string;
    priority: string;
    category: string;
    createdAt: Date;
  }> {
    this.logger.log(`Reporting issue for user: ${userId}`);

    const issue = await this.prisma.activityNote.create({
      data: {
        activityId: data.taskId,
        userId,
        type: 'ISSUE',
        content: data.description,
        metadata: {
          priority: data.priority || 'NORMAL',
          category: data.category || 'GENERAL',
          gpsCoordinates: data.gpsCoordinates,
          photos: data.photos || [],
          reportedAt: new Date().toISOString(),
        },
      },
      include: {
        user: { select: { id: true, name: true } }
      },
    });

    // Broadcast issue reported via WebSocket
    this.activityUpdatesGateway.broadcastActivityUpdate(data.taskId, {
      type: 'issue_reported',
      taskId: data.taskId,
      issue: {
        id: issue.id,
        description: data.description,
        priority: data.priority || 'NORMAL',
        category: data.category || 'GENERAL',
        createdAt: issue.createdAt,
      },
      reportedBy: userId,
    });

    return {
      id: issue.id,
      description: data.description,
      priority: data.priority || 'NORMAL',
      category: data.category || 'GENERAL',
      createdAt: issue.createdAt,
    };
  }

  private formatMobileTask(task: any): MobileTask {
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      progress: task.progress || 0,
      scheduledAt: task.scheduledAt,
      estimatedDuration: task.estimatedDuration,
      farm: task.farm,
      area: task.area,
      cropCycle: task.cropCycle,
      assignments: task.assignments || [],
      notes: task.notes || [],
      metadata: task.metadata,
    };
  }

  private formatMobileTaskDetails(task: any): MobileTaskDetails {
    return {
      ...this.formatMobileTask(task),
      costs: task.costs || [],
      allNotes: task.notes || [],
    };
  }
}
