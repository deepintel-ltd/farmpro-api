import { Controller, UseGuards, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { intelligenceContract } from '../../contracts/intelligence.contract';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { OrganizationIsolationGuard } from '../common/guards/organization-isolation.guard';
import { FeatureAccessGuard } from '../common/guards/feature-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  RequireFeature,
  RequirePermission,
  RequireCapability,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';


interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@ApiTags('intelligence')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, OrganizationIsolationGuard, FeatureAccessGuard, PermissionsGuard)
@RequireFeature('intelligence')
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
  @RequirePermission('intelligence', 'create')
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
  @RequirePermission('intelligence', 'create')
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
  @RequirePermission('intelligence', 'read')
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
  @RequirePermission('intelligence', 'read')
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
  @RequirePermission('intelligence', 'create')
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
  @RequirePermission('intelligence', 'read')
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
  @RequirePermission('intelligence', 'read')
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
  @RequirePermission('intelligence', 'create')
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
  @RequirePermission('intelligence', 'read')
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
  @RequirePermission('intelligence', 'read')
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
  @RequirePermission('intelligence', 'read')
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
  @RequirePermission('intelligence', 'read')
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
