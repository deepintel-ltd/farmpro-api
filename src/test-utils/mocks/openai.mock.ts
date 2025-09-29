import { Logger } from '@nestjs/common';

export class MockOpenAIService {
  private readonly logger = new Logger(MockOpenAIService.name);

  async generateWithContext(systemPrompt: string, userPrompt: string, options?: any) {
    this.logger.debug('MockOpenAIService.generateWithContext called with:', { systemPrompt, userPrompt, options });
    return {
      content: `Mock AI response for: ${userPrompt}`,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    };
  }

  async generateFarmAnalysis(analysisType: string, data: any, options?: any) {
    this.logger.debug('MockOpenAIService.generateFarmAnalysis called with:', { analysisType, data, options });
    return {
      content: JSON.stringify({
        insights: ['Farm analysis insight 1', 'Farm analysis insight 2'],
        recommendations: ['Farm recommendation 1', 'Farm recommendation 2'],
        confidence: 0.9,
        data: {
          yieldPrediction: 1500,
          soilHealth: 'Good',
          weatherImpact: 'Positive',
          pestRisk: 'Low',
          recommendations: ['Increase irrigation', 'Apply fertilizer']
        }
      }),
      usage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 }
    };
  }

  async generateMarketAnalysis(commodity: string, region: string | undefined, analysisType: string, timeframe: string, options?: any) {
    this.logger.debug('MockOpenAIService.generateMarketAnalysis called with:', { commodity, region, analysisType, timeframe, options });
    return {
      content: JSON.stringify({
        insights: ['Market insight 1', 'Market insight 2'],
        recommendations: ['Market recommendation 1', 'Market recommendation 2'],
        confidence: 0.8,
        predictions: [
          { date: '2024-02-01T00:00:00.000Z', value: 4.50, confidence: 0.8 },
          { date: '2024-03-01T00:00:00.000Z', value: 4.75, confidence: 0.7 },
          { date: '2024-04-01T00:00:00.000Z', value: 4.60, confidence: 0.6 }
        ],
        riskFactors: ['Weather', 'Economic conditions'],
        data: {
          pricePrediction: 4.50,
          demandForecast: 'High',
          supplyAnalysis: 'Moderate'
        }
      }),
      usage: { promptTokens: 110, completionTokens: 55, totalTokens: 165 }
    };
  }

  async generateActivityOptimization(activityType: string, constraints: any, objectives: string[], options?: any) {
    this.logger.debug('MockOpenAIService.generateActivityOptimization called with:', { activityType, constraints, objectives, options });
    return {
      content: JSON.stringify({
        insights: ['Activity optimization insight 1', 'Activity optimization insight 2'],
        recommendations: ['Activity recommendation 1', 'Activity recommendation 2'],
        confidence: 0.75,
        optimizedPlan: {
          schedule: [
            { date: '2024-02-01T00:00:00.000Z', activity: 'Prepare soil', resources: ['tractor', 'plow'], cost: 150 },
            { date: '2024-02-02T00:00:00.000Z', activity: 'Plant seeds', resources: ['seeds', 'planter'], cost: 200 },
            { date: '2024-02-03T00:00:00.000Z', activity: 'Apply fertilizer', resources: ['fertilizer', 'spreader'], cost: 100 }
          ],
          totalCost: 450,
          totalDuration: 3,
          expectedYield: 1200,
          riskScore: 0.3
        },
        alternatives: [
          {
            description: 'Extended timeline approach',
            pros: ['Lower risk', 'Better resource utilization'],
            cons: ['Longer duration', 'Higher labor costs'],
            cost: 500
          },
          {
            description: 'Intensive approach',
            pros: ['Faster completion', 'Higher yield potential'],
            cons: ['Higher risk', 'More resource intensive'],
            cost: 400
          }
        ],
        data: {
          optimizedSchedule: '2024-01-15',
          resourceAllocation: 'Optimal',
          costSavings: 15.5,
          efficiencyGain: 20.0
        }
      }),
      usage: { promptTokens: 90, completionTokens: 45, totalTokens: 135 }
    };
  }

  parseJsonResponse(content: string, fallback?: any) {
    try {
      return JSON.parse(content);
    } catch {
      return fallback || { 
        insights: ['Default insight'], 
        recommendations: ['Default recommendation'], 
        confidence: 0.5 
      };
    }
  }

  async healthCheck() {
    return {
      status: 'healthy',
      models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo']
    };
  }

  async createChatCompletion(_options: any) {
    this.logger.debug('MockOpenAIService.createChatCompletion called with:', { _options });
    return {
      content: JSON.stringify({
        insights: ['Chat completion insight'],
        recommendations: ['Chat completion recommendation'],
        confidence: 0.8
      }),
      usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 }
    };
  }

  async generateText(prompt: string, _options?: any) {
    this.logger.debug('MockOpenAIService.generateText called with:', { prompt, _options });
    return {
      content: `Mock generated text for: ${prompt}`,
      usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 }
    };
  }
}
