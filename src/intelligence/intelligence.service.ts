import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OpenAIService } from './openai.service';
import {
  IntelligenceRequest,
  IntelligenceResponse,
  FarmAnalysisRequest,
  FarmAnalysisResponse,
  MarketIntelligenceRequest,
  MarketIntelligenceResponse,
  ActivityOptimizationRequest,
  ActivityOptimizationResponse,
  IntelligenceQuery,
  IntelligenceListResponse,
} from '../../contracts/intelligence.schemas';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenAIService,
  ) {}

  /**
   * Generate AI response for general queries
   */
  async generateResponse(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    try {
      this.logger.log(`Generating AI response for user ${request.userId}`);

      const systemPrompt = this.buildSystemPrompt(request.context, request.farmId);
      const completion = await this.openaiService.generateWithContext(
        systemPrompt,
        request.prompt,
        {
          model: request.model,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }
      );

      const response: IntelligenceResponse = {
        id: crypto.randomUUID(),
        content: completion.content,
        model: request.model,
        usage: completion.usage,
        createdAt: new Date(),
        userId: request.userId,
        farmId: request.farmId,
      };

      // Store the response in database
      await this.storeIntelligenceResponse(response);

      return response;
    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      throw error; // Let the OpenAI service handle error transformation
    }
  }

  /**
   * Analyze farm data and provide insights
   */
  async analyzeFarm(request: FarmAnalysisRequest): Promise<FarmAnalysisResponse> {
    try {
      this.logger.log(`Analyzing farm ${request.farmId} for user ${request.userId}`);

      // Verify farm exists
      const farm = await this.prisma.farm.findUnique({
        where: { id: request.farmId },
      });

      if (!farm) {
        throw new NotFoundException('Farm not found');
      }

      const completion = await this.openaiService.generateFarmAnalysis(
        request.analysisType,
        request.data
      );

      const response = this.openaiService.parseJsonResponse(completion.content, {
        insights: [completion.content],
        recommendations: ['Review the analysis for specific recommendations'],
        confidence: 0.7,
        data: { rawResponse: completion.content },
      });
      
      const analysisResponse: FarmAnalysisResponse = {
        id: crypto.randomUUID(),
        farmId: request.farmId,
        analysisType: request.analysisType,
        insights: response.insights,
        recommendations: response.recommendations,
        confidence: response.confidence,
        data: response.data,
        createdAt: new Date(),
        userId: request.userId,
      };

      // Store the analysis in database
      await this.storeFarmAnalysis(analysisResponse);

      return analysisResponse;
    } catch (error) {
      this.logger.error('Error analyzing farm:', error);
      throw error; // Let the OpenAI service handle error transformation
    }
  }

  /**
   * Analyze market conditions and trends
   */
  async analyzeMarket(request: MarketIntelligenceRequest): Promise<MarketIntelligenceResponse> {
    try {
      this.logger.log(`Analyzing market for ${request.commodity} for user ${request.userId}`);

      const completion = await this.openaiService.generateMarketAnalysis(
        request.commodity,
        request.region,
        request.analysisType,
        request.timeframe
      );

      const response = this.openaiService.parseJsonResponse(completion.content, {
        predictions: [],
        insights: [completion.content],
        recommendations: ['Review the analysis for specific recommendations'],
        riskFactors: ['Market volatility'],
      });
      
      const marketResponse: MarketIntelligenceResponse = {
        id: crypto.randomUUID(),
        commodity: request.commodity,
        region: request.region,
        analysisType: request.analysisType,
        predictions: response.predictions,
        insights: response.insights,
        recommendations: response.recommendations,
        riskFactors: response.riskFactors,
        createdAt: new Date(),
        userId: request.userId,
      };

      // Store the analysis in database
      await this.storeMarketAnalysis(marketResponse);

      return marketResponse;
    } catch (error) {
      this.logger.error('Error analyzing market:', error);
      throw error; // Let the OpenAI service handle error transformation
    }
  }

  /**
   * Optimize farm activities
   */
  async optimizeActivity(request: ActivityOptimizationRequest): Promise<ActivityOptimizationResponse> {
    try {
      this.logger.log(`Optimizing activity for farm ${request.farmId} for user ${request.userId}`);

      // Verify farm exists
      const farm = await this.prisma.farm.findUnique({
        where: { id: request.farmId },
      });

      if (!farm) {
        throw new NotFoundException('Farm not found');
      }

      const completion = await this.openaiService.generateActivityOptimization(
        request.activityType,
        request.constraints,
        request.objectives
      );

      const response = this.openaiService.parseJsonResponse(completion.content, {
        optimizedPlan: {
          schedule: [],
          totalCost: 0,
          totalDuration: 0,
          riskScore: 0.5,
        },
        alternatives: [],
      });
      
      const optimizationResponse: ActivityOptimizationResponse = {
        id: crypto.randomUUID(),
        farmId: request.farmId,
        activityType: request.activityType,
        optimizedPlan: response.optimizedPlan,
        alternatives: response.alternatives,
        createdAt: new Date(),
        userId: request.userId,
      };

      // Store the optimization in database
      await this.storeActivityOptimization(optimizationResponse);

      return optimizationResponse;
    } catch (error) {
      this.logger.error('Error optimizing activity:', error);
      throw error; // Let the OpenAI service handle error transformation
    }
  }

  /**
   * Get intelligence response by ID
   */
  async getIntelligenceResponse(id: string): Promise<IntelligenceResponse> {
    const response = await this.prisma.intelligenceResponse.findUnique({
      where: { id },
    });

    if (!response) {
      throw new NotFoundException('Intelligence response not found');
    }

    return response as IntelligenceResponse;
  }

  /**
   * Get farm analysis by ID
   */
  async getFarmAnalysis(id: string): Promise<FarmAnalysisResponse> {
    const analysis = await this.prisma.farmAnalysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      throw new NotFoundException('Farm analysis not found');
    }

    return analysis as FarmAnalysisResponse;
  }

  /**
   * Get market analysis by ID
   */
  async getMarketAnalysis(id: string): Promise<MarketIntelligenceResponse> {
    const analysis = await this.prisma.marketAnalysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      throw new NotFoundException('Market analysis not found');
    }

    return analysis as MarketIntelligenceResponse;
  }

  /**
   * Get activity optimization by ID
   */
  async getActivityOptimization(id: string): Promise<ActivityOptimizationResponse> {
    const optimization = await this.prisma.activityOptimization.findUnique({
      where: { id },
    });

    if (!optimization) {
      throw new NotFoundException('Activity optimization not found');
    }

    return optimization as ActivityOptimizationResponse;
  }

  /**
   * List intelligence responses with pagination
   */
  async listIntelligenceHistory(query: IntelligenceQuery): Promise<IntelligenceListResponse> {
    const { page, limit, userId, farmId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (farmId) where.farmId = farmId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [responses, total] = await Promise.all([
      this.prisma.intelligenceResponse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.intelligenceResponse.count({ where }),
    ]);

    return {
      data: responses as IntelligenceResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Health check for intelligence service
   */
  async healthCheck() {
    try {
      const health = await this.openaiService.healthCheck();
      
      return {
        status: health.status,
        timestamp: new Date(),
        version: '1.0.0',
        models: health.models,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy' as const,
        timestamp: new Date(),
        version: '1.0.0',
        models: [],
      };
    }
  }

  // Private helper methods

  private buildSystemPrompt(context?: string, farmId?: string): string {
    let prompt = `You are an AI assistant specialized in agricultural and farm management. You provide expert advice on:
- Crop management and optimization
- Farm operations and planning
- Market analysis and trading
- Resource management
- Sustainability practices
- Risk assessment and mitigation

Always provide practical, actionable advice based on agricultural best practices and current industry standards.`;

    if (context) {
      prompt += `\n\nAdditional context: ${context}`;
    }

    if (farmId) {
      prompt += `\n\nThis request is related to farm ID: ${farmId}`;
    }

    return prompt;
  }

  // Database storage methods

  private async storeIntelligenceResponse(response: IntelligenceResponse): Promise<void> {
    await this.prisma.intelligenceResponse.create({
      data: {
        id: response.id,
        content: response.content,
        model: response.model,
        usage: response.usage,
        userId: response.userId,
        farmId: response.farmId,
        createdAt: response.createdAt,
      },
    });
    this.logger.log(`Stored intelligence response ${response.id}`);
  }

  private async storeFarmAnalysis(analysis: FarmAnalysisResponse): Promise<void> {
    await this.prisma.farmAnalysis.create({
      data: {
        id: analysis.id,
        farmId: analysis.farmId,
        analysisType: analysis.analysisType,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        confidence: analysis.confidence,
        data: analysis.data,
        userId: analysis.userId,
        createdAt: analysis.createdAt,
      },
    });
    this.logger.log(`Stored farm analysis ${analysis.id}`);
  }

  private async storeMarketAnalysis(analysis: MarketIntelligenceResponse): Promise<void> {
    await this.prisma.marketAnalysis.create({
      data: {
        id: analysis.id,
        commodity: analysis.commodity,
        region: analysis.region,
        analysisType: analysis.analysisType,
        predictions: analysis.predictions,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        riskFactors: analysis.riskFactors,
        userId: analysis.userId,
        createdAt: analysis.createdAt,
      },
    });
    this.logger.log(`Stored market analysis ${analysis.id}`);
  }

  private async storeActivityOptimization(optimization: ActivityOptimizationResponse): Promise<void> {
    await this.prisma.activityOptimization.create({
      data: {
        id: optimization.id,
        farmId: optimization.farmId,
        activityType: optimization.activityType,
        optimizedPlan: optimization.optimizedPlan,
        alternatives: optimization.alternatives,
        userId: optimization.userId,
        createdAt: optimization.createdAt,
      },
    });
    this.logger.log(`Stored activity optimization ${optimization.id}`);
  }
}
