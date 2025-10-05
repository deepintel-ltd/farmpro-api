import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { SubscriptionService } from '@/billing/services/subscription.service';
import { PrismaService } from '@/prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: CurrentUser;
}

interface UsageCache {
  count: number;
  timestamp: number;
}

@Injectable()
export class UsageLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(UsageLimitMiddleware.name);
  private readonly usageCache = new Map<string, UsageCache>();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {
    // Clean cache every 5 minutes
    setInterval(() => this.cleanCache(), 300000);
  }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const user = req.user;

    // Skip for platform admins
    if (user?.isPlatformAdmin) {
      return next();
    }

    // Skip for non-authenticated requests
    if (!user || !user.organizationId) {
      return next();
    }

    // Check limits before allowing resource creation
    if (this.isResourceCreation(req)) {
      const resourceType = this.getResourceType(req);
      
      if (resourceType) {
        try {
          const currentUsage = await this.getCurrentUsage(user.organizationId, resourceType);
          const limitCheck = await this.subscriptionService.checkLimit(
            user.organizationId,
            resourceType,
            currentUsage,
          );

          if (!limitCheck.allowed) {
            this.logger.warn(
              `User ${user.email} exceeded ${resourceType} limit: ${currentUsage}/${limitCheck.limit}`,
            );
            throw new ForbiddenException(
              `Usage limit exceeded for ${resourceType}. Current: ${currentUsage}/${limitCheck.limit}. Please upgrade your plan or contact support.`,
            );
          }

          // Check if approaching limit (80% threshold)
          const usagePercentage = currentUsage / limitCheck.limit;
          if (usagePercentage >= 0.8 && !limitCheck.isUnlimited) {
            this.logger.warn(
              `User ${user.email} approaching ${resourceType} limit: ${currentUsage}/${limitCheck.limit} (${(usagePercentage * 100).toFixed(1)}%)`,
            );
            // Add warning header
            res.setHeader('X-Usage-Warning', `${resourceType} usage at ${(usagePercentage * 100).toFixed(1)}%`);
          }
        } catch (error) {
          if (error instanceof ForbiddenException) {
            throw error;
          }
          this.logger.error(`Error checking usage limits: ${error.message}`);
          // Don't block request on error, but log it
        }
      }
    }

    next();
  }

  private isResourceCreation(req: Request): boolean {
    return req.method === 'POST' && this.isResourceEndpoint(req.path);
  }

  private isResourceEndpoint(path: string): boolean {
    const resourceEndpoints = [
      '/users',
      '/farms',
      '/activities',
      '/listings',
      '/orders',
      '/inventory',
    ];

    return resourceEndpoints.some(endpoint => path.includes(endpoint));
  }

  private getResourceType(req: Request): 'users' | 'farms' | 'activities' | 'listings' | null {
    const path = req.path;

    if (path.includes('/users')) return 'users';
    if (path.includes('/farms')) return 'farms';
    if (path.includes('/activities')) return 'activities';
    if (path.includes('/listings')) return 'listings';

    return null;
  }

  private async getCurrentUsage(organizationId: string, resourceType: string): Promise<number> {
    const cacheKey = `${organizationId}:${resourceType}`;

    // Check cache first
    const cached = this.usageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Using cached usage for ${cacheKey}: ${cached.count}`);
      return cached.count;
    }

    // Fetch fresh data
    let count = 0;

    switch (resourceType) {
      case 'users':
        count = await this.prisma.user.count({
          where: {
            organizationId,
            isActive: true
          },
        });
        break;

      case 'farms':
        count = await this.prisma.farm.count({
          where: {
            organizationId,
            isActive: true
          },
        });
        break;

      case 'activities':
        // Count activities for current billing period
        const subscription = await this.subscriptionService['getCurrentSubscriptionInternal'](organizationId);
        count = await this.prisma.farmActivity.count({
          where: {
            farm: { organizationId },
            createdAt: {
              gte: subscription.currentPeriodStart,
              lte: subscription.currentPeriodEnd,
            },
          },
        });
        break;

      case 'listings':
        count = await this.prisma.marketplaceListing.count({
          where: {
            organizationId,
            status: 'ACTIVE',
          },
        });
        break;

      default:
        count = 0;
    }

    // Update cache
    this.usageCache.set(cacheKey, {
      count,
      timestamp: Date.now(),
    });

    return count;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    this.usageCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL_MS) {
        entriesToDelete.push(key);
      }
    });

    entriesToDelete.forEach(key => this.usageCache.delete(key));

    if (entriesToDelete.length > 0) {
      this.logger.debug(`Cleaned ${entriesToDelete.length} expired cache entries`);
    }
  }

  /**
   * Invalidate cache for a specific organization and resource type
   */
  invalidateCache(organizationId: string, resourceType: string): void {
    const cacheKey = `${organizationId}:${resourceType}`;
    this.usageCache.delete(cacheKey);
    this.logger.debug(`Invalidated cache for ${cacheKey}`);
  }
}
