// =============================================================================
// Analytics Type Definitions
// =============================================================================

export interface DateFilter {
  gte: Date;
  lte: Date;
}

export interface WhereClause {
  organizationId: string;
  farmId?: string;
  createdAt?: DateFilter;
}

export interface RevenueData {
  _sum: { amount: any | null }; // Prisma Decimal type
  _count: { id: number };
}

export interface CostData {
  _sum: { amount: any | null }; // Prisma Decimal type
  _count: { id: number };
}

export interface ActivityWithCosts {
  id: string;
  type: string;
  status: string;
  actualDuration?: number | null;
  costs: Array<{
    amount: any; // Prisma Decimal type
  }>;
  assignments: Array<{
    id: string;
  }>;
  progressLogs?: Array<{
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

export interface ActivityStatusData {
  timestamp: string;
  value: number;
}

export interface ActivityTypeData {
  timestamp: string;
  value: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  data: ChartDataPoint[];
  xAxis: string;
  yAxis: string;
  series?: string[];
  options?: Record<string, unknown>;
}

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change?: number;
  changePercent?: number;
  benchmark?: number;
  target?: number;
  metadata?: Record<string, unknown>;
}

export interface SummaryData {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
}

export interface ReportData {
  financial: {
    revenue: number;
    costs: number;
    netProfit: number;
  };
  operational: {
    totalActivities: number;
    completedActivities: number;
    totalYield: number;
  };
  market: {
    totalOrders: number;
    totalSales: number;
    uniqueCustomers: number;
  };
}

export interface CustomerData {
  id: string;
  name: string;
  totalOrders: number;
  totalValue: number;
  lastOrderDate: Date;
}

export interface PricingData {
  id: string;
  totalPrice: number;
  items: Array<{
    quantity: number;
    commodity: {
      id: string;
      name: string;
    };
  }>;
  createdAt: Date;
}

export interface OrderWithDetails {
  id: string;
  totalPrice: number;
  buyerId: string;
  buyer?: {
    id: string;
    name: string;
  };
  items: Array<{
    quantity: number;
    commodity: {
      id: string;
      name: string;
    };
  }>;
  createdAt: Date;
}

export interface CropCycleWithDetails {
  id: string;
  actualYield: number | null;
  status: string;
  createdAt: Date;
  harvests: Array<{
    id: string;
    quantity: number;
  }>;
  commodity: {
    id: string;
    name: string;
  };
  area: {
    id: string;
    name: string;
  };
}

export interface InventoryWithDetails {
  id: string;
  quantity: number;
  status: string;
  createdAt: Date;
  commodity: {
    id: string;
    name: string;
  };
  harvest: {
    id: string;
    cropCycle: {
      id: string;
    };
  };
}
