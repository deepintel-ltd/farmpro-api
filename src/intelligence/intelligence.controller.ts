import { Controller, UseGuards, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { intelligenceContract } from '../../contracts/intelligence.contract';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @TsRestHandler(intelligenceContract.generateResponse)
  async generateResponse(@Request() req: any) {
    return tsRestHandler(intelligenceContract.generateResponse, async ({ body }) => {
      // Add user ID from JWT token
      const requestWithUser = {
        ...body,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.generateResponse(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.analyzeFarm)
  async analyzeFarm(@Request() req: any) {
    return tsRestHandler(intelligenceContract.analyzeFarm, async ({ body }) => {
      const requestWithUser = {
        ...body,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.analyzeFarm(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getFarmAnalysis)
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
  async listFarmAnalyses(@Request() req: any) {
    return tsRestHandler(intelligenceContract.listFarmAnalyses, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.analyzeMarket)
  async analyzeMarket(@Request() req: any) {
    return tsRestHandler(intelligenceContract.analyzeMarket, async ({ body }) => {
      const requestWithUser = {
        ...body,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.analyzeMarket(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getMarketAnalysis)
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
  async listMarketAnalyses(@Request() req: any) {
    return tsRestHandler(intelligenceContract.listMarketAnalyses, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.optimizeActivity)
  async optimizeActivity(@Request() req: any) {
    return tsRestHandler(intelligenceContract.optimizeActivity, async ({ body }) => {
      const requestWithUser = {
        ...body,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.optimizeActivity(requestWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getActivityOptimization)
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
  async listActivityOptimizations(@Request() req: any) {
    return tsRestHandler(intelligenceContract.listActivityOptimizations, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getIntelligenceHistory)
  async getIntelligenceHistory(@Request() req: any) {
    return tsRestHandler(intelligenceContract.getIntelligenceHistory, async ({ query }) => {
      const queryWithUser = {
        ...query,
        userId: req.user.id,
      };

      const response = await this.intelligenceService.listIntelligenceHistory(queryWithUser);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.getIntelligenceResponse)
  async getIntelligenceResponse() {
    return tsRestHandler(intelligenceContract.getIntelligenceResponse, async ({ params }) => {
      const response = await this.intelligenceService.getIntelligenceResponse(params.id);
      return {
        status: 200,
        body: response,
      };
    });
  }

  @TsRestHandler(intelligenceContract.health)
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
