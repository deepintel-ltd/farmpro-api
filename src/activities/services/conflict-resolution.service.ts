import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ConflictResolutionStrategy {
  strategy: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE' | 'MANUAL';
  reason?: string;
}

export interface SyncConflict {
  field: string;
  serverValue: any;
  clientValue: any;
  lastModified: {
    server: Date;
    client: Date;
  };
  conflictType: 'UPDATE_CONFLICT' | 'DELETE_CONFLICT' | 'CREATE_CONFLICT';
}

export interface ConflictResolutionResult {
  resolved: boolean;
  finalValue: any;
  strategy: ConflictResolutionStrategy;
  conflicts: SyncConflict[];
}

@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve conflicts between server and client data
   */
  async resolveConflicts(
    entityType: 'activity' | 'note' | 'progress',
    entityId: string,
    clientData: any,
    clientLastSync: Date,
    userId: string
  ): Promise<ConflictResolutionResult> {
    this.logger.debug(`Resolving conflicts for ${entityType}:${entityId}`);

    // Get current server state
    const serverData = await this.getServerData(entityType, entityId);
    if (!serverData) {
      return {
        resolved: true,
        finalValue: clientData,
        strategy: { strategy: 'CLIENT_WINS', reason: 'Entity not found on server' },
        conflicts: []
      };
    }

    // Detect conflicts
    const conflicts = this.detectConflicts(serverData, clientData, clientLastSync);
    
    if (conflicts.length === 0) {
      return {
        resolved: true,
        finalValue: clientData,
        strategy: { strategy: 'CLIENT_WINS', reason: 'No conflicts detected' },
        conflicts: []
      };
    }

    // Resolve conflicts based on strategy
    const resolution = await this.applyConflictResolutionStrategy(
      entityType,
      entityId,
      serverData,
      clientData,
      conflicts,
      userId
    );

    return resolution;
  }

  /**
   * Get current server data for an entity
   */
  private async getServerData(entityType: string, entityId: string): Promise<any> {
    switch (entityType) {
      case 'activity':
        return await this.prisma.farmActivity.findUnique({
          where: { id: entityId },
          include: {
            notes: {
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            progressLogs: {
              orderBy: { timestamp: 'desc' },
              take: 10
            }
          }
        });
      
      case 'note':
        return await this.prisma.activityNote.findUnique({
          where: { id: entityId }
        });
      
      case 'progress':
        return await this.prisma.activityProgressLog.findUnique({
          where: { id: entityId }
        });
      
      default:
        return null;
    }
  }

  /**
   * Detect conflicts between server and client data
   */
  private detectConflicts(
    serverData: any,
    clientData: any,
    clientLastSync: Date
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Check if server data was modified after client last sync
    const serverLastModified = new Date(serverData.updatedAt || serverData.createdAt);
    if (serverLastModified <= clientLastSync) {
      return conflicts; // No conflicts if server wasn't modified after client sync
    }

    // Check for conflicts in key fields
    const fieldsToCheck = this.getFieldsToCheck(serverData);
    
    for (const field of fieldsToCheck) {
      const serverValue = this.getNestedValue(serverData, field);
      const clientValue = this.getNestedValue(clientData, field);
      
      if (this.hasConflict(serverValue, clientValue)) {
        conflicts.push({
          field,
          serverValue,
          clientValue,
          lastModified: {
            server: serverLastModified,
            client: clientLastSync
          },
          conflictType: this.getConflictType(serverValue, clientValue)
        });
      }
    }

    return conflicts;
  }

  /**
   * Get fields that should be checked for conflicts
   */
  private getFieldsToCheck(data: any): string[] {
    const baseFields = ['status', 'progress', 'notes', 'metadata'];
    
    // Add entity-specific fields
    if (data.type) {
      baseFields.push('type', 'name', 'description', 'priority');
    }
    
    return baseFields;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if two values have a conflict
   */
  private hasConflict(serverValue: any, clientValue: any): boolean {
    if (serverValue === clientValue) return false;
    if (serverValue == null && clientValue == null) return false;
    if (serverValue == null || clientValue == null) return true;
    
    // For objects, do deep comparison
    if (typeof serverValue === 'object' && typeof clientValue === 'object') {
      return JSON.stringify(serverValue) !== JSON.stringify(clientValue);
    }
    
    return serverValue !== clientValue;
  }

  /**
   * Determine conflict type
   */
  private getConflictType(serverValue: any, clientValue: any): SyncConflict['conflictType'] {
    if (serverValue == null) return 'CREATE_CONFLICT';
    if (clientValue == null) return 'DELETE_CONFLICT';
    return 'UPDATE_CONFLICT';
  }

  /**
   * Apply conflict resolution strategy
   */
  private async applyConflictResolutionStrategy(
    entityType: string,
    entityId: string,
    serverData: any,
    clientData: any,
    conflicts: SyncConflict[],
    userId: string
  ): Promise<ConflictResolutionResult> {
    // For now, implement a simple strategy: server wins for critical fields, client wins for others
    const criticalFields = ['status', 'type', 'name'];
    const finalValue = { ...clientData };

    for (const conflict of conflicts) {
      if (criticalFields.includes(conflict.field)) {
        // Server wins for critical fields
        this.setNestedValue(finalValue, conflict.field, conflict.serverValue);
        this.logger.debug(`Resolved conflict for ${conflict.field}: server wins`);
      } else {
        // Client wins for non-critical fields
        this.setNestedValue(finalValue, conflict.field, conflict.clientValue);
        this.logger.debug(`Resolved conflict for ${conflict.field}: client wins`);
      }
    }

    // Add conflict resolution metadata
    if (finalValue.metadata) {
      finalValue.metadata.conflictResolution = {
        resolvedAt: new Date().toISOString(),
        resolvedBy: userId,
        conflictsResolved: conflicts.length,
        strategy: 'HYBRID'
      };
    }

    return {
      resolved: true,
      finalValue,
      strategy: { 
        strategy: 'MERGE', 
        reason: 'Hybrid resolution: server wins for critical fields, client wins for others' 
      },
      conflicts
    };
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Create a conflict resolution log entry
   */
  async logConflictResolution(
    entityType: string,
    entityId: string,
    conflicts: SyncConflict[],
    resolution: ConflictResolutionResult,
    userId: string
  ): Promise<void> {
    try {
      // Log to database for audit trail
      await this.prisma.activityNote.create({
        data: {
          activityId: entityType === 'activity' ? entityId : undefined,
          userId,
          type: 'GENERAL',
          content: `Conflict resolution applied: ${conflicts.length} conflicts resolved using ${resolution.strategy.strategy} strategy`,
          metadata: {
            conflictResolution: {
              entityType,
              entityId,
              conflicts: conflicts.map(c => ({
                field: c.field,
                conflictType: c.conflictType,
                resolvedValue: this.getNestedValue(resolution.finalValue, c.field)
              })),
              strategy: resolution.strategy,
              resolvedAt: new Date().toISOString()
            }
          }
        }
      });

      this.logger.log(`Conflict resolution logged for ${entityType}:${entityId}`, {
        conflictsCount: conflicts.length,
        strategy: resolution.strategy.strategy,
        userId
      });
    } catch (error) {
      this.logger.error('Failed to log conflict resolution:', error);
    }
  }
}
