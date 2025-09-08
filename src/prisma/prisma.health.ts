import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  database: {
    connected: boolean;
    responseTime?: number;
  };
  timestamp: string;
}

@Injectable()
export class PrismaHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    
    try {
      const startTime = Date.now();
      const isConnected = await this.prisma.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        database: {
          connected: isConnected,
          responseTime,
        },
        timestamp,
      };
    } catch {
      return {
        status: 'unhealthy',
        database: {
          connected: false,
        },
        timestamp,
      };
    }
  }
}
