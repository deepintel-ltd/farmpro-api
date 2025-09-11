import {
  Injectable,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerRequest } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Enhanced rate limiting guard with custom logic for different endpoint types
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RateLimitGuard.name);

  protected async getTracker(req: Request): Promise<string> {
    // Create a unique identifier for rate limiting
    // Priority: User ID > IP Address
    const user = (req as any).user;
    const userId = user?.userId || user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Use user ID if available (authenticated requests)
    if (userId) {
      return `user:${userId}`;
    }

    // For unauthenticated requests, use IP + User Agent hash
    const fingerprint = this.createFingerprint(ip, userAgent);
    return `ip:${fingerprint}`;
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.route?.path || request.url;

    // Different limits for different endpoint types
    if (this.isAnalyticsEndpoint(path)) {
      return 30; // Analytics endpoints: 30 requests per minute
    }

    if (this.isAuthEndpoint(path)) {
      return 10; // Auth endpoints: 10 requests per minute (prevent brute force)
    }

    if (this.isUploadEndpoint(path)) {
      return 5; // Upload endpoints: 5 requests per minute
    }

    if (this.isHealthEndpoint(path)) {
      return 120; // Health endpoints: 120 requests per minute (monitoring systems)
    }

    // Default limit for other endpoints
    return 60; // General endpoints: 60 requests per minute
  }

  protected async getTtl(context: ExecutionContext): Promise<number> {
    // All limits are per minute (60 seconds)
    return 60;
  }

  protected async getErrorMessage(
    context: ExecutionContext
  ): Promise<string> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.route?.path || request.url;
    const limit = await this.getLimit(context);

    return `Rate limit exceeded for ${path}. Maximum ${limit} requests per minute allowed.`;
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    try {
      const result = await super.handleRequest(requestProps);
      
      // Log successful requests for monitoring
      const { context, limit, ttl } = requestProps;
      const request = context.switchToHttp().getRequest<Request>();
      const tracker = await this.getTracker(request);
      const path = request.route?.path || request.url;
      
      this.logger.debug(
        `Rate limit check passed for ${tracker} on ${path} (${limit} per ${ttl}s)`
      );
      
      return result;
    } catch (error) {
      const { context, limit, ttl } = requestProps;
      const request = context.switchToHttp().getRequest<Request>();
      const tracker = await this.getTracker(request);
      const path = request.route?.path || request.url;
      const ip = request.ip;
      
      // Log rate limit violations
      this.logger.warn(
        `Rate limit exceeded for ${tracker} on ${path} from IP ${ip}`,
        {
          tracker,
          path,
          ip,
          limit,
          ttl,
          userAgent: request.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      );

      // Throw custom rate limit exception with structured error
      if (error instanceof ThrottlerException) {
        throw new HttpException(
          {
            errors: [{
              status: '429',
              title: 'Too Many Requests',
              detail: await this.getErrorMessage(context),
              code: 'RATE_LIMIT_EXCEEDED',
              source: { pointer: request.url },
              meta: {
                limit,
                window: ttl,
                retryAfter: ttl
              }
            }]
          },
          HttpStatus.TOO_MANY_REQUESTS,
          {
            cause: error,
            description: 'Rate limit exceeded'
          }
        );
      }

      throw error;
    }
  }

  /**
   * Check if the endpoint is analytics-related
   */
  private isAnalyticsEndpoint(path: string): boolean {
    return path.includes('/analytics') || 
           path.includes('/dashboard') ||
           path.includes('/reports');
  }

  /**
   * Check if the endpoint is authentication-related
   */
  private isAuthEndpoint(path: string): boolean {
    return path.includes('/auth') ||
           path.includes('/login') ||
           path.includes('/register') ||
           path.includes('/password');
  }

  /**
   * Check if the endpoint is upload-related
   */
  private isUploadEndpoint(path: string): boolean {
    return path.includes('/upload') ||
           path.includes('/media') ||
           path.includes('/files');
  }

  /**
   * Check if the endpoint is health-related
   */
  private isHealthEndpoint(path: string): boolean {
    return path.includes('/health') ||
           path.includes('/ping') ||
           path.includes('/status');
  }

  /**
   * Create a fingerprint for anonymous users
   */
  private createFingerprint(ip: string, userAgent: string): string {
    // Simple hash to create consistent fingerprint
    const combined = `${ip}:${userAgent}`;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}
