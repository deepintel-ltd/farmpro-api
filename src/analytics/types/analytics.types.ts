// =============================================================================
// Analytics Service Types - Essential Internal Types Only
// =============================================================================

import { Decimal } from '@prisma/client/runtime/library';

// Database query helpers
export interface DateFilter {
  gte: Date;
  lte: Date;
}

export interface WhereClause {
  organizationId: string;
  farmId?: string;
  createdAt?: DateFilter;
}

// Prisma aggregation results
export interface RevenueData {
  _sum: { amount: Decimal | null };
  _count: { id: number };
}

export interface CostData {
  _sum: { amount: Decimal | null };
  _count: { id: number };
}

// Service layer data structures
export interface ActivityWithCosts {
  id: string;
  type: string;
  status: string;
  actualDuration?: number | null;
  costs: Array<{
    amount: Decimal;
  }>;
  assignments: Array<{
    id: string;
  }>;
}

export interface HarvestWithDetails {
  id: string;
  quantity: number;
  harvestDate: Date;
  cropCycle?: {
    id: string;
    commodity: {
      id: string;
      name: string;
    };
  };
}

// Chart data structures
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

// Service response builders
export interface ServiceResponse<T> {
  data: T;
  cacheKey?: string;
  generatedAt: string;
}
