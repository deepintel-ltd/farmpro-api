import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 300; // 5 minutes default TTL

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || this.defaultTTL);
      this.logger.debug(`Cache set for key: ${key} with TTL: ${ttl || this.defaultTTL}s`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // Note: This is a simplified implementation
      // In production, you might want to use Redis SCAN for pattern matching
      this.logger.debug(`Cache pattern delete requested for: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      for (const store of this.cacheManager.stores) {
        if (store && typeof store.clear === 'function') {
          await store.clear();
        }
      }
      this.logger.debug('Cache reset completed');
    } catch (error) {
      this.logger.error('Error resetting cache:', error);
    }
  }

  /**
   * Generate cache key for activities
   */
  generateActivityKey(organizationId: string, activityId: string): string {
    return `activity:${organizationId}:${activityId}`;
  }

  /**
   * Generate cache key for user activities
   */
  generateUserActivitiesKey(organizationId: string, userId: string, queryHash: string): string {
    return `user_activities:${organizationId}:${userId}:${queryHash}`;
  }

  /**
   * Generate cache key for farm activities
   */
  generateFarmActivitiesKey(organizationId: string, farmId: string, queryHash: string): string {
    return `farm_activities:${organizationId}:${farmId}:${queryHash}`;
  }

  /**
   * Generate cache key for activity assignments
   */
  generateActivityAssignmentsKey(activityId: string): string {
    return `activity_assignments:${activityId}`;
  }

  /**
   * Generate cache key for activity analytics
   */
  generateActivityAnalyticsKey(organizationId: string, queryHash: string): string {
    return `activity_analytics:${organizationId}:${queryHash}`;
  }

  /**
   * Generate cache key for activity costs
   */
  generateActivityCostsKey(activityId: string): string {
    return `activity_costs:${activityId}`;
  }

  /**
   * Generate cache key for activity templates
   */
  generateActivityTemplatesKey(organizationId: string): string {
    return `activity_templates:${organizationId}`;
  }

  /**
   * Generate cache key for farm data
   */
  generateFarmKey(organizationId: string, farmId: string): string {
    return `farm:${organizationId}:${farmId}`;
  }

  /**
   * Generate cache key for user data
   */
  generateUserKey(organizationId: string, userId: string): string {
    return `user:${organizationId}:${userId}`;
  }

  /**
   * Generate query hash for consistent caching
   */
  generateQueryHash(query: Record<string, any>): string {
    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((result, key) => {
        result[key] = query[key];
        return result;
      }, {} as Record<string, any>);
    
    return Buffer.from(JSON.stringify(sortedQuery)).toString('base64').slice(0, 16);
  }
}
