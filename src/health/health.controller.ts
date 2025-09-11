import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { healthContract } from '../../contracts/health.contract';
import { PrismaHealthService } from '../prisma/prisma.health';
import { ErrorResponseUtil } from '../common/utils/error-response.util';

@ApiTags('Health')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prismaHealthService: PrismaHealthService) {}

  @TsRestHandler(healthContract.health)
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string', example: 'farmpro-api' },
        version: { type: 'string', example: '1.0.0' },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['connected', 'disconnected'] },
            latency: { type: 'number', example: 25 }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy' 
  })
  async health() {
    return tsRestHandler(healthContract.health, async () => {
      try {
        this.logger.log('Health check requested');
        
        const healthCheck = await this.prismaHealthService.checkHealth();
        const timestamp = new Date().toISOString();
        
        // Determine overall status
        const isHealthy = healthCheck.status === 'healthy' && healthCheck.database.connected;
        
        if (isHealthy) {
          const response = {
            status: 'ok' as const,
            timestamp,
            service: 'farmpro-api' as const,
            version: process.env.npm_package_version || '1.0.0',
            database: {
              status: 'connected' as const,
              latency: healthCheck.database.responseTime
            }
          };
          
          this.logger.log(`Health check passed: DB latency ${healthCheck.database.responseTime}ms`);
          return { status: 200, body: response };
        } else {
          this.logger.error('Health check failed: Database disconnected');
          return {
            status: 503,
            body: {
              errors: [{
                status: '503',
                title: 'Service Unavailable',
                detail: 'Database connection failed',
                code: 'DATABASE_UNAVAILABLE'
              }]
            }
          };
        }
      } catch (error) {
        this.logger.error('Health check error:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Health check failed',
          internalErrorCode: 'HEALTH_CHECK_FAILED'
        });
      }
    });
  }

  /**
   * Simple liveness probe endpoint
   */
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe for container orchestration' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness() {
    this.logger.log('Liveness probe requested');
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe endpoint with dependency checks
   */
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe for container orchestration' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness() {
    try {
      this.logger.log('Readiness probe requested');
      
      const healthCheck = await this.prismaHealthService.checkHealth();
      
      if (healthCheck.status === 'healthy' && healthCheck.database.connected) {
        return {
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks: {
            database: 'connected',
            latency: healthCheck.database.responseTime
          }
        };
      } else {
        this.logger.warn('Readiness check failed: Database not ready');
        throw new Error('Database not ready');
      }
    } catch (error) {
      this.logger.error('Readiness check failed:', error);
      return ErrorResponseUtil.handleCommonError(error, {
        internalErrorMessage: 'Service is not ready',
        internalErrorCode: 'SERVICE_NOT_READY'
      });
    }
  }
}
