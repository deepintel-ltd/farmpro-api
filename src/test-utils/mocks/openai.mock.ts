import { Logger } from '@nestjs/common';

export class MockOpenAIService {
  private readonly logger = new Logger(MockOpenAIService.name);

  async generateWithContext(_prompt: string, _context: any) {
    this.logger.debug('MockOpenAIService.generateWithContext called with:', { _prompt, _context });
    return {
      content: JSON.stringify({
        insights: ['Mock insight 1', 'Mock insight 2'],
        recommendations: ['Mock recommendation 1', 'Mock recommendation 2'],
        confidence: 0.85
      }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    };
  }

  async generateFarmAnalysis(_data: any) {
    this.logger.debug('MockOpenAIService.generateFarmAnalysis called with:', { _data });
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

  async generateMarketAnalysis(_data: any) {
    this.logger.debug('MockOpenAIService.generateMarketAnalysis called with:', { _data });
    return {
      content: JSON.stringify({
        insights: ['Market insight 1', 'Market insight 2'],
        recommendations: ['Market recommendation 1', 'Market recommendation 2'],
        confidence: 0.8,
        data: {
          pricePrediction: 4.50,
          demandForecast: 'High',
          supplyAnalysis: 'Moderate',
          riskFactors: ['Weather', 'Economic conditions']
        }
      }),
      usage: { promptTokens: 110, completionTokens: 55, totalTokens: 165 }
    };
  }

  async generateActivityOptimization(_data: any) {
    this.logger.debug('MockOpenAIService.generateActivityOptimization called with:', { _data });
    return {
      content: JSON.stringify({
        insights: ['Activity optimization insight 1', 'Activity optimization insight 2'],
        recommendations: ['Activity recommendation 1', 'Activity recommendation 2'],
        confidence: 0.75,
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
      model: 'gpt-4-mock',
      lastChecked: new Date().toISOString()
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
