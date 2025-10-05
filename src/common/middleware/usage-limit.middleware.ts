import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { SubscriptionService } from '@/billing/services/subscription.service';
import { PrismaService } from '@/prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: CurrentUser;
}

@Injectable()
export class UsageLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(UsageLimitMiddleware.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

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
    switch (resourceType) {
      case 'users':
        return this.prisma.user.count({
          where: { 
            organizationId, 
            isActive: true 
          },
        });
      
      case 'farms':
        return this.prisma.farm.count({
          where: { 
            organizationId, 
            isActive: true 
          },
        });
      
      case 'activities':
        // Count activities for current billing period
        const subscription = await this.subscriptionService['getCurrentSubscriptionInternal'](organizationId);
        return this.prisma.farmActivity.count({
          where: {
            farm: { organizationId },
            createdAt: {
              gte: subscription.currentPeriodStart,
              lte: subscription.currentPeriodEnd,
            },
          },
        });
      
      case 'listings':
        return this.prisma.marketplaceListing.count({
          where: {
            organizationId,
            status: 'ACTIVE',
          },
        });
      
      default:
        return 0;
    }
  }
}
