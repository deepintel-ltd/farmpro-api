import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketService } from '../../market/market.service';
import { Job, JobProcessor } from '../../common/services/job-queue.service';

export interface MarketAnalysisJobData {
  commodityId: string;
  organizationId: string;
  harvestData: {
    quantityHarvested: number;
    unit: string;
    qualityGrade?: string;
  };
  activityId: string;
  userId: string;
}

@Injectable()
export class MarketAnalysisJobProcessor implements JobProcessor {
  readonly type = 'market_analysis';
  private readonly logger = new Logger(MarketAnalysisJobProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  async process(job: Job): Promise<any> {
    const data = job.data as MarketAnalysisJobData;
    
    this.logger.log('Processing market analysis job', {
      jobId: job.id,
      commodityId: data.commodityId,
      activityId: data.activityId
    });

    try {
      // Get commodity information
      const commodity = await this.prisma.commodity.findUnique({
        where: { id: data.commodityId },
        select: { id: true, name: true, category: true }
      });

      if (!commodity) {
        throw new Error(`Commodity not found: ${data.commodityId}`);
      }

      // Get current market analysis for this commodity
      const marketAnalysis = await this.marketService.getMarketAnalysis(
        { userId: data.userId } as any,
        {
          commodityId: data.commodityId,
          region: 'North America', // Default region - could be made configurable
          period: '30d'
        }
      );

      // Get price trends for the commodity
      const priceTrends = await this.marketService.getPriceTrends(
        { userId: data.userId } as any,
        {
          commodityId: data.commodityId,
          period: '30d',
          grade: data.harvestData.qualityGrade
        }
      );

      // Log market analysis results
      await this.prisma.activity.create({
        data: {
          action: 'MARKET_ANALYSIS_COMPLETED',
          organizationId: data.organizationId,
          entity: 'Commodity',
          entityId: data.commodityId,
          metadata: {
            description: `Market analysis completed for harvest: ${data.harvestData.quantityHarvested} ${data.harvestData.unit} of ${commodity.name}`,
            commodityId: data.commodityId,
            commodityName: commodity.name,
            harvestQuantity: data.harvestData.quantityHarvested,
            harvestUnit: data.harvestData.unit,
            qualityGrade: data.harvestData.qualityGrade,
            marketAnalysis: {
              currentPrice: marketAnalysis?.currentPrice,
              priceTrend: marketAnalysis?.priceTrend,
              demandLevel: marketAnalysis?.demandLevel,
              recommendations: marketAnalysis?.recommendations
            },
            priceTrends: priceTrends?.trends,
            activityId: data.activityId
          }
        }
      });

      // Create market analysis record
      await this.prisma.marketAnalysis.create({
        data: {
          commodity: commodity.name,
          region: 'North America',
          analysisType: 'HARVEST_OPPORTUNITY',
          predictions: JSON.stringify(priceTrends?.trends || []),
          insights: marketAnalysis?.insights || [],
          recommendations: marketAnalysis?.recommendations || [],
          riskFactors: marketAnalysis?.riskFactors || [],
          userId: data.userId
        }
      });

      this.logger.log('Market analysis job completed successfully', {
        jobId: job.id,
        commodityId: data.commodityId,
        activityId: data.activityId
      });

      return {
        success: true,
        commodityId: data.commodityId,
        activityId: data.activityId,
        marketAnalysis: marketAnalysis?.currentPrice,
        priceTrends: priceTrends?.trends?.length || 0
      };

    } catch (error) {
      this.logger.error('Market analysis job failed', {
        jobId: job.id,
        commodityId: data.commodityId,
        activityId: data.activityId,
        error: error.message
      });

      // Log the failure
      await this.prisma.activity.create({
        data: {
          action: 'MARKET_ANALYSIS_FAILED',
          organizationId: data.organizationId,
          entity: 'Commodity',
          entityId: data.commodityId,
          metadata: {
            description: `Market analysis failed for harvest: ${data.harvestData.quantityHarvested} ${data.harvestData.unit} of ${commodity?.name || 'Unknown'}`,
            error: error.message,
            activityId: data.activityId
          }
        }
      });

      throw error;
    }
  }
}
