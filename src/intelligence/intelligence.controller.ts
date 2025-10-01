import { Controller, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { intelligenceContract } from '../../contracts/intelligence.contract';
import { IntelligenceService } from './intelligence.service';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import {
  RequirePermission,
} from '../common/decorators/authorization.decorators';


interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
@Secured(FEATURES.INTELLIGENCE)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @ApiOperation({ 
    summary: 'Generate AI response',
    description: 'Generate an AI-powered response based on user input and context'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'AI response generated successfully',
    schema: {
      type: 'object',
      properties: {
        response: { type: 'string', description: 'AI-generated response' },
        usage: {
          type: 'object',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @TsRestHandler(intelligenceContract.generateResponse)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.CREATE)
  async generateResponse(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.generateResponse, async ({ body }) => {
      // Add user ID from JWT token
      const requestWithUser = {
        ...body,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.generateResponse(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @ApiOperation({ 
    summary: 'Analyze farm data',
    description: 'Perform AI-powered analysis of farm data and operations'
  })
  @ApiResponse({ status: 200, description: 'Farm analysis completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @TsRestHandler(intelligenceContract.analyzeFarm)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.CREATE)
  async analyzeFarm(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.analyzeFarm, async ({ body }) => {
      const requestWithUser = {
        ...body,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.analyzeFarm(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getFarmAnalysis)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async getFarmAnalysis() {
    return tsRestHandler(intelligenceContract.getFarmAnalysis, async ({ params }) => {
      const response = await this.intelligenceService.getFarmAnalysis(params.id);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.listFarmAnalyses)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async listFarmAnalyses(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.listFarmAnalyses, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.analyzeMarket)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.CREATE)
  async analyzeMarket(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.analyzeMarket, async ({ body }) => {
      const requestWithUser = {
        ...body,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.analyzeMarket(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getMarketAnalysis)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async getMarketAnalysis() {
    return tsRestHandler(intelligenceContract.getMarketAnalysis, async ({ params }) => {
      const response = await this.intelligenceService.getMarketAnalysis(params.id);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.listMarketAnalyses)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async listMarketAnalyses(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.listMarketAnalyses, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.optimizeActivity)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.CREATE)
  async optimizeActivity(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.optimizeActivity, async ({ body }) => {
      const requestWithUser = {
        ...body,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.optimizeActivity(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getActivityOptimization)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async getActivityOptimization() {
    return tsRestHandler(intelligenceContract.getActivityOptimization, async ({ params }) => {
      const response = await this.intelligenceService.getActivityOptimization(params.id);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.listActivityOptimizations)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async listActivityOptimizations(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.listActivityOptimizations, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getIntelligenceHistory)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async getIntelligenceHistory(@Request() req: AuthenticatedRequest) {
    return tsRestHandler(intelligenceContract.getIntelligenceHistory, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.userId,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getIntelligenceResponse)
  @RequirePermission(...PERMISSIONS.INTELLIGENCE.READ)
  async getIntelligenceResponse() {
    return tsRestHandler(intelligenceContract.getIntelligenceResponse, async ({ params }) => {
      const response = await this.intelligenceService.getIntelligenceResponse(params.id);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @Public()
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Check the health and availability of the intelligence service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        models: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Available AI models'
        }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Service unavailable' })
  @TsRestHandler(intelligenceContract.health)
  @Public()
  async health() {
    return tsRestHandler(intelligenceContract.health, async () => {
      const response = await this.intelligenceService.healthCheck();
      return {
        status: 200,
        body: response,
      };
    });
  }
}
