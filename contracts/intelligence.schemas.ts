import { z } from 'zod';

// Base schemas
export const IntelligenceRequestSchema = z.object({
  prompt: z.string().min(1).max(4000).describe('The prompt or question for the AI'),
  context: z.string().optional().describe('Additional context for the AI'),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo']).default('gpt-3.5-turbo').describe('OpenAI model to use'),
  temperature: z.number().min(0).max(2).default(0.7).describe('Temperature for response generation'),
  maxTokens: z.number().min(1).max(4000).default(1000).describe('Maximum tokens in response'),
  userId: z.string().uuid().optional().describe('User making the request (added by controller)'),
  farmId: z.string().optional().describe('Farm context for the request'),
});

export const IntelligenceResponseSchema = z.object({
  id: z.string().describe('Unique response identifier'),
  content: z.string().describe('AI generated response'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Priority level of the insight'),
  category: z.enum(['efficiency', 'performance', 'market', 'sustainability', 'risk']).optional().describe('Category of the insight'),
  model: z.string().describe('Model used for generation'),
  usage: z.object({
    promptTokens: z.number().describe('Tokens used in prompt'),
    completionTokens: z.number().describe('Tokens used in completion'),
    totalTokens: z.number().describe('Total tokens used'),
  }).describe('Token usage statistics'),
  createdAt: z.date().describe('Response creation timestamp'),
  userId: z.string().uuid().describe('User who made the request'),
  farmId: z.string().optional().describe('Farm context'),
});

// Farm-specific intelligence schemas
export const FarmAnalysisRequestSchema = z.object({
  farmId: z.string().describe('Farm to analyze'),
  analysisType: z.enum([
    'crop_health',
    'yield_prediction',
    'pest_detection',
    'soil_analysis',
    'weather_impact',
    'market_optimization',
    'resource_efficiency',
    'sustainability_score'
  ]).describe('Type of analysis to perform'),
  data: z.record(z.string(), z.any()).describe('Farm data for analysis'),
  userId: z.string().uuid().optional().describe('User requesting analysis (added by controller)'),
});

export const FarmAnalysisResponseSchema = z.object({
  id: z.string().describe('Analysis identifier'),
  farmId: z.string().describe('Farm analyzed'),
  analysisType: z.string().describe('Type of analysis performed'),
  insights: z.array(z.string()).describe('Key insights from analysis'),
  recommendations: z.array(z.string()).describe('Actionable recommendations'),
  confidence: z.number().min(0).max(1).describe('Confidence score (0-1)'),
  data: z.record(z.string(), z.any()).describe('Analysis results data'),
  createdAt: z.date().describe('Analysis timestamp'),
  userId: z.string().uuid().describe('User who requested analysis'),
});

// Market intelligence schemas
export const MarketIntelligenceRequestSchema = z.object({
  commodity: z.string().describe('Commodity to analyze'),
  region: z.string().optional().describe('Geographic region'),
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly').describe('Analysis timeframe'),
  analysisType: z.enum([
    'price_prediction',
    'demand_forecast',
    'supply_analysis',
    'trend_analysis',
    'risk_assessment',
    'opportunity_identification'
  ]).describe('Type of market analysis'),
  userId: z.string().uuid().optional().describe('User requesting analysis (added by controller)'),
});

export const MarketIntelligenceResponseSchema = z.object({
  id: z.string().describe('Analysis identifier'),
  commodity: z.string().describe('Commodity analyzed'),
  region: z.string().optional().describe('Geographic region'),
  analysisType: z.string().describe('Type of analysis performed'),
  predictions: z.array(z.object({
    date: z.date().describe('Prediction date'),
    value: z.number().describe('Predicted value'),
    confidence: z.number().min(0).max(1).describe('Confidence in prediction'),
  })).describe('Market predictions'),
  insights: z.array(z.string()).describe('Key market insights'),
  recommendations: z.array(z.string()).describe('Trading recommendations'),
  riskFactors: z.array(z.string()).describe('Identified risk factors'),
  createdAt: z.date().describe('Analysis timestamp'),
  userId: z.string().uuid().describe('User who requested analysis'),
});

// Activity optimization schemas
export const ActivityOptimizationRequestSchema = z.object({
  farmId: z.string().describe('Farm for optimization'),
  activityType: z.string().describe('Type of activity to optimize'),
  constraints: z.object({
    budget: z.number().optional().describe('Budget constraint'),
    time: z.number().optional().describe('Time constraint in days'),
    resources: z.array(z.string()).optional().describe('Available resources'),
    weather: z.object({
      temperature: z.number().optional(),
      humidity: z.number().optional(),
      precipitation: z.number().optional(),
    }).optional().describe('Weather constraints'),
  }).describe('Optimization constraints'),
  objectives: z.array(z.enum(['maximize_yield', 'minimize_cost', 'minimize_time', 'maximize_quality', 'minimize_risk'])).describe('Optimization objectives'),
  userId: z.string().uuid().optional().describe('User requesting optimization (added by controller)'),
});

export const ActivityOptimizationResponseSchema = z.object({
  id: z.string().describe('Optimization identifier'),
  farmId: z.string().describe('Farm optimized'),
  activityType: z.string().describe('Activity type optimized'),
  optimizedPlan: z.object({
    schedule: z.array(z.object({
      date: z.date().describe('Scheduled date'),
      activity: z.string().describe('Activity description'),
      resources: z.array(z.string()).describe('Required resources'),
      cost: z.number().describe('Estimated cost'),
    })).describe('Optimized schedule'),
    totalCost: z.number().describe('Total estimated cost'),
    totalDuration: z.number().describe('Total duration in days'),
    expectedYield: z.number().optional().describe('Expected yield improvement'),
    riskScore: z.number().min(0).max(1).describe('Risk assessment score'),
  }).describe('Optimized activity plan'),
  alternatives: z.array(z.object({
    description: z.string().describe('Alternative approach'),
    pros: z.array(z.string()).describe('Advantages'),
    cons: z.array(z.string()).describe('Disadvantages'),
    cost: z.number().describe('Estimated cost'),
  })).describe('Alternative optimization approaches'),
  createdAt: z.date().describe('Optimization timestamp'),
  userId: z.string().uuid().describe('User who requested optimization'),
});

// Export schemas
export const IntelligenceExportRequestSchema = z.object({
  farmId: z.string().describe('Farm to export intelligence data for'),
  includeInsights: z.boolean().default(true).describe('Include intelligence insights in export'),
  includeAnalyses: z.boolean().default(true).describe('Include farm analyses in export'),
  includeHistory: z.boolean().default(true).describe('Include intelligence history in export'),
  dateRange: z.object({
    start: z.date().describe('Start date for data filtering'),
    end: z.date().describe('End date for data filtering'),
  }).optional().describe('Optional date range filter'),
});

export const IntelligenceExportResponseSchema = z.object({
  downloadUrl: z.string().describe('URL to download the exported PDF file'),
  expiresAt: z.date().describe('When the download URL expires'),
  fileSize: z.number().describe('Size of the exported file in bytes'),
});

export const IntelligenceExportJobResponseSchema = z.object({
  jobId: z.string().describe('Job identifier for tracking export progress'),
  status: z.enum(['processing', 'completed', 'failed']).describe('Current job status'),
  estimatedCompletion: z.date().optional().describe('Estimated completion time'),
});

// Error schemas
export const IntelligenceErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      'INVALID_REQUEST',
      'MODEL_UNAVAILABLE',
      'RATE_LIMIT_EXCEEDED',
      'INSUFFICIENT_CREDITS',
      'CONTENT_FILTERED',
      'CONTEXT_TOO_LONG',
      'INVALID_MODEL',
      'API_ERROR',
      'FARM_NOT_FOUND',
      'INSUFFICIENT_DATA',
      'ANALYSIS_FAILED',
      'EXPORT_FAILED',
      'INVALID_FORMAT',
      'FILE_GENERATION_ERROR'
    ]).describe('Error code'),
    message: z.string().describe('Human-readable error message'),
    details: z.string().optional().describe('Additional error details'),
    timestamp: z.date().describe('Error timestamp'),
    requestId: z.string().describe('Request identifier for tracking'),
  }).describe('Error information'),
  suggestions: z.array(z.string()).optional().describe('Actionable suggestions to resolve the error'),
});

// Query schemas
export const IntelligenceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).describe('Page number'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Items per page'),
  userId: z.string().uuid().optional().describe('Filter by user'),
  farmId: z.string().optional().describe('Filter by farm'),
  type: z.enum(['general', 'farm_analysis', 'market_intelligence', 'activity_optimization']).optional().describe('Filter by type'),
  startDate: z.date().optional().describe('Filter by start date'),
  endDate: z.date().optional().describe('Filter by end date'),
});

export const IntelligenceListResponseSchema = z.object({
  data: z.array(IntelligenceResponseSchema),
  pagination: z.object({
    page: z.number().describe('Current page'),
    limit: z.number().describe('Items per page'),
    total: z.number().describe('Total items'),
    totalPages: z.number().describe('Total pages'),
  }).describe('Pagination information'),
});

// Export all schemas
export type IntelligenceRequest = z.infer<typeof IntelligenceRequestSchema>;
export type IntelligenceResponse = z.infer<typeof IntelligenceResponseSchema>;
export type FarmAnalysisRequest = z.infer<typeof FarmAnalysisRequestSchema>;
export type FarmAnalysisResponse = z.infer<typeof FarmAnalysisResponseSchema>;
export type MarketIntelligenceRequest = z.infer<typeof MarketIntelligenceRequestSchema>;
export type MarketIntelligenceResponse = z.infer<typeof MarketIntelligenceResponseSchema>;
export type ActivityOptimizationRequest = z.infer<typeof ActivityOptimizationRequestSchema>;
export type ActivityOptimizationResponse = z.infer<typeof ActivityOptimizationResponseSchema>;
export type IntelligenceExportRequest = z.infer<typeof IntelligenceExportRequestSchema>;
export type IntelligenceExportResponse = z.infer<typeof IntelligenceExportResponseSchema>;
export type IntelligenceExportJobResponse = z.infer<typeof IntelligenceExportJobResponseSchema>;
export type IntelligenceError = z.infer<typeof IntelligenceErrorSchema>;
export type IntelligenceQuery = z.infer<typeof IntelligenceQuerySchema>;
export type IntelligenceListResponse = z.infer<typeof IntelligenceListResponseSchema>;
