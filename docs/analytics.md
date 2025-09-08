# Integrated Analytics & Reporting Endpoints

## Cross-Platform Dashboard Analytics

### GET /api/analytics/dashboard
**Purpose**: Get unified analytics dashboard
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `farmId`, `metrics`, `comparison`
**Response**: `200` - Integrated farm + trading performance KPIs

### GET /api/analytics/farm-to-market
**Purpose**: Get farm-to-market journey analytics
**Access**: Permission: `analytics:read` + farm access
**Query**: `cropCycleId`, `commodityId`, `period`
**Response**: `200` - Complete value chain from production to sale

### GET /api/analytics/profitability
**Purpose**: Get integrated profitability analysis
**Access**: Permission: `finance:read` + organization access
**Query**: `period`, `farmId`, `commodityId`, `breakdown`
**Response**: `200` - Combined farming + trading profit analysis

### GET /api/analytics/roi-analysis
**Purpose**: Get return on investment analysis
**Access**: Permission: `finance:read` + organization access
**Query**: `period`, `investmentType`, `farmId`
**Response**: `200` - ROI across farm operations and market activities

## Production vs Market Performance

### GET /api/analytics/yield-vs-market
**Purpose**: Compare yield performance to market opportunities
**Access**: Permission: `analytics:read` + farm access
**Query**: `commodityId`, `season`, `region`
**Response**: `200` - Yield efficiency vs market price realization

### GET /api/analytics/quality-premium
**Purpose**: Analyze quality premium capture
**Access**: Permission: `analytics:read` + organization access
**Query**: `commodityId`, `period`, `qualityGrade`
**Response**: `200` - Price premiums achieved by quality level

### GET /api/analytics/timing-analysis
**Purpose**: Analyze market timing effectiveness
**Access**: Permission: `analytics:read` + organization access
**Query**: `commodityId`, `period`, `strategy`
**Response**: `200` - Harvest timing vs optimal selling windows

### GET /api/analytics/direct-vs-intermediary
**Purpose**: Compare direct sales vs intermediary channels
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `commodityId`, `channel`
**Response**: `200` - Profitability and efficiency by sales channel

## Operational Efficiency Analytics

### GET /api/analytics/activity-efficiency
**Purpose**: Get farm activity efficiency metrics
**Access**: Permission: `analytics:read` + farm access
**Query**: `period`, `activityType`, `farmId`, `comparison`
**Response**: `200` - Time, cost, and resource utilization analysis

### GET /api/analytics/resource-utilization
**Purpose**: Analyze resource utilization across operations
**Access**: Permission: `analytics:read` + organization access
**Query**: `resourceType`, `period`, `farmId`
**Response**: `200` - Equipment, labor, and input efficiency metrics

### GET /api/analytics/cost-optimization
**Purpose**: Get cost optimization opportunities
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `costCategory`, `farmId`
**Response**: `200` - Cost reduction recommendations and benchmarks

### GET /api/analytics/workflow-analysis
**Purpose**: Analyze workflow efficiency
**Access**: Permission: `analytics:read` + organization access
**Query**: `workflowType`, `period`, `farmId`
**Response**: `200` - Bottlenecks, cycle times, and optimization opportunities

## Market Intelligence & Competitiveness

### GET /api/analytics/market-positioning
**Purpose**: Analyze competitive market position
**Access**: Permission: `market:research` + organization access
**Query**: `commodityId`, `region`, `competitor`
**Response**: `200` - Market share, pricing position, competitive advantages

### GET /api/analytics/customer-analysis
**Purpose**: Analyze customer relationships and performance
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `customerId`, `metric`
**Response**: `200` - Customer profitability, retention, and satisfaction

### GET /api/analytics/supplier-performance
**Purpose**: Analyze supplier relationships (for buyers)
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `supplierId`, `metric`
**Response**: `200` - Supplier reliability, quality, and cost analysis

### GET /api/analytics/price-realization
**Purpose**: Analyze price realization vs market benchmarks
**Access**: Permission: `analytics:read` + organization access
**Query**: `commodityId`, `period`, `benchmark`
**Response**: `200` - Price achievement vs market averages and peaks

## Predictive Analytics & Forecasting

### GET /api/analytics/demand-prediction
**Purpose**: Get demand forecasting for planning
**Access**: Permission: `planning:read` + organization access
**Query**: `commodityId`, `horizon`, `scenario`
**Response**: `200` - Predicted demand with confidence intervals

### GET /api/analytics/yield-prediction
**Purpose**: Get yield forecasting for current crops
**Access**: Permission: `analytics:read` + farm access
**Query**: `cropCycleId`, `model`, `factors`
**Response**: `200` - Predicted yields with influencing factors

### GET /api/analytics/price-forecasting
**Purpose**: Get price forecasting and market outlook
**Access**: Permission: `market:research` + organization access
**Query**: `commodityId`, `horizon`, `region`
**Response**: `200` - Price predictions with scenario analysis

### GET /api/analytics/risk-assessment
**Purpose**: Get integrated risk analysis
**Access**: Permission: `analytics:read` + organization access
**Query**: `riskType`, `period`, `scenario`
**Response**: `200` - Production, market, and financial risk evaluation

## Sustainability & Impact Analytics

### GET /api/analytics/sustainability-metrics
**Purpose**: Get sustainability and environmental impact
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `metric`, `farmId`
**Response**: `200` - Carbon footprint, water usage, soil health metrics

### GET /api/analytics/certification-impact
**Purpose**: Analyze certification program impact
**Access**: Permission: `analytics:read` + organization access
**Query**: `certificationType`, `period`
**Response**: `200` - Premium capture and market access from certifications

### GET /api/analytics/waste-reduction
**Purpose**: Analyze waste reduction and efficiency
**Access**: Permission: `analytics:read` + organization access
**Query**: `wasteType`, `period`, `farmId`
**Response**: `200` - Waste patterns, costs, and reduction opportunities

## Comparative & Benchmarking Analytics

### GET /api/analytics/peer-benchmarking
**Purpose**: Compare performance to peer farms
**Access**: Permission: `analytics:read` + organization access
**Query**: `metric`, `farmSize`, `region`, `commodityId`
**Response**: `200` - Anonymous peer comparison and ranking

### GET /api/analytics/industry-benchmarks
**Purpose**: Get industry benchmark comparisons
**Access**: Permission: `analytics:read` + organization access
**Query**: `industry`, `metric`, `region`
**Response**: `200` - Performance vs industry averages

### GET /api/analytics/historical-comparison
**Purpose**: Compare current vs historical performance
**Access**: Permission: `analytics:read` + organization access
**Query**: `metric`, `baselinePeriod`, `currentPeriod`
**Response**: `200` - Year-over-year and period-over-period analysis

## Custom Analytics & Data Science

### POST /api/analytics/custom-query
**Purpose**: Execute custom analytics query
**Access**: Permission: `analytics:advanced` + organization access
**Request**:
```json
{
  "query": {
    "metrics": ["string"],
    "dimensions": ["string"],
    "filters": {},
    "timeframe": {"start": "datetime", "end": "datetime"},
    "granularity": "day|week|month|quarter|year"
  },
  "visualization": {
    "type": "line|bar|pie|scatter|heatmap",
    "options": {}
  }
}
```
**Response**: `200` - Custom analytics results

### GET /api/analytics/data-exports
**Purpose**: List available data exports
**Access**: Permission: `data:export` + organization access
**Response**: `200` - Available datasets for export

### POST /api/analytics/data-exports
**Purpose**: Create analytics data export
**Access**: Permission: `data:export` + organization access
**Request**:
```json
{
  "dataset": "string",
  "filters": {},
  "format": "csv|json|excel|parquet",
  "timeframe": {"start": "datetime", "end": "datetime"},
  "includeMetadata": "boolean"
}
```
**Response**: `202` - Export job created

### GET /api/analytics/insights
**Purpose**: Get AI-generated insights and recommendations
**Access**: Permission: `analytics:read` + organization access
**Query**: `category`, `priority`, `farmId`
**Response**: `200` - Actionable insights and recommendations

## Report Generation & Scheduling

### GET /api/analytics/reports/templates
**Purpose**: List available report templates
**Access**: Permission: `reports:read` + organization access
**Response**: `200` - Standard and custom report templates

### POST /api/analytics/reports/generate
**Purpose**: Generate comprehensive analytics report
**Access**: Permission: `reports:create` + organization access
**Request**:
```json
{
  "templateId": "string",
  "title": "string",
  "parameters": {
    "period": "string",
    "farmIds": ["string"],
    "commodities": ["string"],
    "includeComparisons": "boolean",
    "includePredictions": "boolean"
  },
  "format": "pdf|html|excel",
  "recipients": ["string"], // Email addresses
  "schedule": {
    "frequency": "once|daily|weekly|monthly|quarterly",
    "time": "string",
    "timezone": "string"
  }
}
```
**Response**: `201` - Report generation initiated

### GET /api/analytics/reports
**Purpose**: List generated reports
**Access**: Permission: `reports:read` + organization access
**Query**: `status`, `type`, `dateRange`
**Response**: `200` - Report history with download links

### GET /api/analytics/reports/{reportId}
**Purpose**: Download or view specific report
**Access**: Permission: `reports:read` + organization access
**Response**: `200` - Report content or download

### POST /api/analytics/reports/schedule
**Purpose**: Schedule recurring report
**Access**: Permission: `reports:schedule` + organization access
**Request**:
```json
{
  "reportConfig": {},
  "schedule": {
    "frequency": "weekly|monthly|quarterly",
    "dayOfWeek": "number?",
    "dayOfMonth": "number?",
    "time": "string",
    "timezone": "string"
  },
  "recipients": ["string"],
  "isActive": "boolean"
}
```
**Response**: `201` - Scheduled report created

### GET /api/analytics/reports/scheduled
**Purpose**: List scheduled reports
**Access**: Permission: `reports:read` + organization access
**Response**: `200` - Active scheduled reports

### DELETE /api/analytics/reports/scheduled/{scheduleId}
**Purpose**: Cancel scheduled report
**Access**: Permission: `reports:schedule` + organization access
**Response**: `200` - Schedule cancelled
