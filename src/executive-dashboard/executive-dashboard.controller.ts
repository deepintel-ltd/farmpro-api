import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { 
  ExecutiveDashboardQuerySchema,
  FinancialHealthQuerySchema,
  RiskIndicatorsQuerySchema,
  CashFlowQuerySchema,
  PendingActionsQuerySchema,
  ExecutiveInsightsQuerySchema,
} from '@contracts/executive-dashboard.contract';
import { z } from 'zod';

@ApiTags('Executive Dashboard')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExecutiveDashboardController {
  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService,
  ) {}

  @Get('executive-dashboard')
  @ApiOperation({ 
    summary: 'Get comprehensive executive dashboard overview',
    description: 'Provides executive-level metrics, financial health, risk indicators, and actionable insights for strategic decision-making'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'executive-dashboard' },
            id: { type: 'string', example: 'org-123' },
            attributes: {
              type: 'object',
              properties: {
                financialHealth: { $ref: '#/components/schemas/FinancialHealthScore' },
                riskIndicators: { $ref: '#/components/schemas/RiskIndicator' },
                cashFlow: { $ref: '#/components/schemas/CashFlowAnalysis' },
                keyMetrics: { type: 'array', items: { $ref: '#/components/schemas/ExecutiveMetric' } },
                pendingActions: { type: 'array', items: { $ref: '#/components/schemas/PendingAction' } },
                insights: { type: 'array', items: { $ref: '#/components/schemas/ExecutiveInsight' } },
                lastUpdated: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getExecutiveDashboard(
    @CurrentUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: z.infer<typeof ExecutiveDashboardQuerySchema>
  ) {
    const data = await this.executiveDashboardService.getExecutiveDashboard(user, query);
    
    return {
      data: {
        type: 'executive-dashboard',
        id: user.organizationId,
        attributes: data,
      },
    };
  }

  @Get('financial-health')
  @ApiOperation({ 
    summary: 'Get organization financial health score',
    description: 'Calculates and returns a comprehensive financial health score based on cash flow, profitability, growth, and efficiency metrics'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Financial health data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'financial-health' },
            id: { type: 'string', example: 'org-123' },
            attributes: { $ref: '#/components/schemas/FinancialHealthScore' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getFinancialHealth(
    @CurrentUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: z.infer<typeof FinancialHealthQuerySchema>
  ) {
    const data = await this.executiveDashboardService.calculateFinancialHealth(user, query);
    
    return {
      data: {
        type: 'financial-health',
        id: user.organizationId,
        attributes: data,
      },
    };
  }

  @Get('risk-indicators')
  @ApiOperation({ 
    summary: 'Get organization risk indicators and alerts',
    description: 'Provides comprehensive risk assessment including financial, operational, and market risks with actionable alerts'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Risk indicators data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'risk-indicators' },
            id: { type: 'string', example: 'org-123' },
            attributes: { $ref: '#/components/schemas/RiskIndicator' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getRiskIndicators(
    @CurrentUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: z.infer<typeof RiskIndicatorsQuerySchema>
  ) {
    const data = await this.executiveDashboardService.calculateRiskIndicators(user, query);
    
    return {
      data: {
        type: 'risk-indicators',
        id: user.organizationId,
        attributes: data,
      },
    };
  }

  @Get('cash-flow')
  @ApiOperation({ 
    summary: 'Get organization cash flow analysis',
    description: 'Provides detailed cash flow analysis including current status, projections, burn rate, and runway calculations'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cash flow data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'cash-flow' },
            id: { type: 'string', example: 'org-123' },
            attributes: { $ref: '#/components/schemas/CashFlowAnalysis' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCashFlowAnalysis(
    @CurrentUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: z.infer<typeof CashFlowQuerySchema>
  ) {
    const data = await this.executiveDashboardService.calculateCashFlowAnalysis(user, query);
    
    return {
      data: {
        type: 'cash-flow',
        id: user.organizationId,
        attributes: data,
      },
    };
  }

  @Get('pending-actions')
  @ApiOperation({ 
    summary: 'Get pending executive actions',
    description: 'Retrieves all pending actions requiring executive attention, including approvals, reviews, and decisions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Pending actions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'pending-action' },
              id: { type: 'string', example: 'action-123' },
              attributes: { $ref: '#/components/schemas/PendingAction' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPendingActions(
    @CurrentUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: z.infer<typeof PendingActionsQuerySchema>
  ) {
    const data = await this.executiveDashboardService.getPendingActions(user, query);
    
    return {
      data: data.map((action, index) => ({
        type: 'pending-action',
        id: action.id || `action-${index}`,
        attributes: action,
      })),
      meta: {
        total: data.length,
        page: 1,
        limit: query.limit || 10,
      },
    };
  }

  @Get('executive-insights')
  @ApiOperation({ 
    summary: 'Get executive insights and recommendations',
    description: 'Provides AI-powered insights and recommendations for strategic decision-making'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive insights retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'executive-insight' },
              id: { type: 'string', example: 'insight-123' },
              attributes: { $ref: '#/components/schemas/ExecutiveInsight' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 3 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getExecutiveInsights(
    @CurrentUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: z.infer<typeof ExecutiveInsightsQuerySchema>
  ) {
    const data = await this.executiveDashboardService.getExecutiveInsights(user, query);
    
    return {
      data: data.map((insight, index) => ({
        type: 'executive-insight',
        id: insight.id || `insight-${index}`,
        attributes: insight,
      })),
      meta: {
        total: data.length,
        page: 1,
        limit: query.limit || 10,
      },
    };
  }
}
