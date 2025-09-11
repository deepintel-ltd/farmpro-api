import { Injectable, Logger } from '@nestjs/common';

export interface QueryProjection {
  select?: Record<string, any>;
  include?: Record<string, any>;
}

@Injectable()
export class QueryOptimizationService {
  private readonly logger = new Logger(QueryOptimizationService.name);

  /**
   * Get optimized projection for activity list queries
   */
  getActivityListProjection(): QueryProjection {
    return {
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        scheduledAt: true,
        completedAt: true,
        startedAt: true,
        cost: true,
        estimatedDuration: true,
        actualDuration: true,
        createdAt: true,
        updatedAt: true,
        farmId: true,
        areaId: true,
        cropCycleId: true,
        createdById: true,
        metadata: true,
        // Related data with minimal fields
        farm: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        area: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignments: {
          where: { isActive: true },
          select: {
            id: true,
            userId: true,
            role: true,
            assignedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            costs: true,
            progressLogs: true,
            notes: true
          }
        }
      }
    };
  }

  /**
   * Get optimized projection for single activity queries
   */
  getActivityDetailProjection(): QueryProjection {
    return {
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        scheduledAt: true,
        completedAt: true,
        startedAt: true,
        cost: true,
        estimatedDuration: true,
        actualDuration: true,
        createdAt: true,
        updatedAt: true,
        farmId: true,
        areaId: true,
        cropCycleId: true,
        createdById: true,
        metadata: true,
        // Related data
        farm: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            totalArea: true,
            location: true
          }
        },
        area: {
          select: {
            id: true,
            name: true,
            size: true,
            boundaries: true
          }
        },
        cropCycle: {
          select: {
            id: true,
            commodity: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignments: {
          where: { isActive: true },
          select: {
            id: true,
            userId: true,
            role: true,
            assignedAt: true,
            assignedById: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            assignedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        costs: {
          select: {
            id: true,
            type: true,
            description: true,
            amount: true,
            quantity: true,
            unit: true,
            vendor: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        progressLogs: {
          select: {
            id: true,
            percentComplete: true,
            notes: true,
            issues: true,
            location: true,
            timestamp: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 10
        },
        notes: {
          select: {
            id: true,
            content: true,
            type: true,
            isPrivate: true,
            attachments: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    };
  }

  /**
   * Get optimized projection for activity existence checks
   */
  getActivityExistenceProjection(): QueryProjection {
    return {
      select: {
        id: true,
        farmId: true,
        createdById: true,
        status: true,
        farm: {
          select: {
            organizationId: true
          }
        }
      }
    };
  }

  /**
   * Get optimized projection for farm queries
   */
  getFarmProjection(): QueryProjection {
    return {
      select: {
        id: true,
        name: true,
        organizationId: true,
        totalArea: true,
        isActive: true
      }
    };
  }

  /**
   * Get optimized projection for user queries
   */
  getUserProjection(): QueryProjection {
    return {
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
        isActive: true
      }
    };
  }

  /**
   * Get optimized projection for assignment queries
   */
  getAssignmentProjection(): QueryProjection {
    return {
      select: {
        id: true,
        activityId: true,
        userId: true,
        role: true,
        isActive: true,
        assignedAt: true,
        assignedById: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    };
  }

  /**
   * Get optimized projection for analytics queries
   */
  getAnalyticsProjection(): QueryProjection {
    return {
      select: {
        id: true,
        type: true,
        status: true,
        priority: true,
        cost: true,
        estimatedDuration: true,
        actualDuration: true,
        createdAt: true,
        completedAt: true,
        farmId: true,
        createdById: true,
        _count: {
          select: {
            costs: true,
            progressLogs: true,
            notes: true
          }
        }
      }
    };
  }

  /**
   * Get optimized projection for mobile task queries
   */
  getMobileTaskProjection(): QueryProjection {
    return {
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        scheduledAt: true,
        completedAt: true,
        startedAt: true,
        estimatedDuration: true,
        actualDuration: true,
        metadata: true,
        farm: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        area: {
          select: {
            id: true,
            name: true,
            size: true
          }
        },
        assignments: {
          where: { isActive: true },
          select: {
            userId: true,
            role: true
          }
        }
      }
    };
  }

  /**
   * Get optimized projection for cost queries
   */
  getCostProjection(): QueryProjection {
    return {
      select: {
        id: true,
        type: true,
        description: true,
        amount: true,
        quantity: true,
        unit: true,
        vendor: true,
        createdAt: true,
        createdById: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    };
  }

  /**
   * Get optimized projection for note queries
   */
  getNoteProjection(): QueryProjection {
    return {
      select: {
        id: true,
        content: true,
        type: true,
        isPrivate: true,
        attachments: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    };
  }

  /**
   * Apply pagination to a query
   */
  applyPagination(query: any, page?: number, pageSize?: number): any {
    if (page && pageSize) {
      query.skip = (page - 1) * pageSize;
      query.take = pageSize;
    }
    return query;
  }

  /**
   * Apply sorting to a query
   */
  applySorting(query: any, sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): any {
    if (sortBy) {
      query.orderBy = { [sortBy]: sortOrder };
    }
    return query;
  }

  /**
   * Apply date range filtering to a query
   */
  applyDateRange(query: any, startDate?: Date, endDate?: Date, field: string = 'createdAt'): any {
    if (startDate || endDate) {
      query.where = query.where || {};
      query.where[field] = {};
      if (startDate) query.where[field].gte = startDate;
      if (endDate) query.where[field].lte = endDate;
    }
    return query;
  }

  /**
   * Log query performance
   */
  logQueryPerformance(operation: string, duration: number, recordCount?: number): void {
    this.logger.debug(`Query performance: ${operation}`, {
      duration: `${duration}ms`,
      recordCount: recordCount || 'unknown'
    });
  }
}
