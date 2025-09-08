# Inventory Management Endpoints

## Inventory CRUD Operations

### GET /api/inventory
**Purpose**: List organization's inventory with filtering
**Access**: Permission: `inventory:read` + organization access
**Query**: `farmId`, `commodityId`, `status`, `location`, `qualityGrade`, `lowStock`, `expiryAlert`, `page`, `limit`
**Response**: `200` - Paginated inventory list

### GET /api/inventory/{inventoryId}
**Purpose**: Get detailed inventory item information
**Access**: Permission: `inventory:read` + organization access
**Response**: `200` - Complete inventory details with history, reservations

### POST /api/inventory
**Purpose**: Add new inventory item
**Access**: Permission: `inventory:create` + farm access
**Request**:
```json
{
  "farmId": "string",
  "commodityId": "string",
  "harvestId": "string?",
  "quantity": "number",
  "unit": "string",
  "quality": {
    "grade": "premium|grade_a|grade_b|standard",
    "moisture": "number?",
    "specifications": {},
    "certifications": ["organic", "non-gmo"]
  },
  "location": {
    "facility": "string",
    "section": "string?",
    "coordinates": {"lat": "number", "lng": "number"}
  },
  "costBasis": "number", // Cost per unit
  "batchNumber": "string?",
  "harvestDate": "datetime?",
  "expiryDate": "datetime?",
  "storageConditions": {
    "temperature": "number?",
    "humidity": "number?",
    "requirements": "string"
  },
  "metadata": {}
}
```
**Response**: `201` - Created inventory item

### PUT /api/inventory/{inventoryId}
**Purpose**: Update inventory details
**Access**: Permission: `inventory:update` + organization access
**Request**:
```json
{
  "quantity": "number",
  "quality": {},
  "location": {},
  "status": "AVAILABLE|RESERVED|SOLD|CONSUMED|EXPIRED",
  "storageConditions": {},
  "notes": "string"
}
```
**Response**: `200` - Updated inventory

### DELETE /api/inventory/{inventoryId}
**Purpose**: Remove inventory item
**Access**: Permission: `inventory:delete` + organization access
**Response**: `200` - Inventory removed

## Inventory Tracking & Movements

### GET /api/inventory/{inventoryId}/movements
**Purpose**: Get inventory movement history
**Access**: Permission: `inventory:read` + organization access
**Response**: `200` - Movement log with dates, quantities, reasons

### POST /api/inventory/{inventoryId}/adjust
**Purpose**: Adjust inventory quantity
**Access**: Permission: `inventory:adjust` + organization access
**Request**:
```json
{
  "adjustment": "number", // Positive or negative
  "reason": "damage|spoilage|theft|count_error|consumption|sale|transfer",
  "notes": "string",
  "evidence": ["string"], // Photo URLs for verification
  "approvedBy": "string?" // Manager user ID
}
```
**Response**: `200` - Inventory adjusted

### POST /api/inventory/{inventoryId}/reserve
**Purpose**: Reserve inventory for order
**Access**: Permission: `inventory:reserve` + organization access
**Request**:
```json
{
  "quantity": "number",
  "orderId": "string",
  "reservedUntil": "datetime",
  "notes": "string?"
}
```
**Response**: `200` - Inventory reserved

### POST /api/inventory/{inventoryId}/release
**Purpose**: Release inventory reservation
**Access**: Permission: `inventory:reserve` + organization access
**Request**:
```json
{
  "quantity": "number",
  "orderId": "string",
  "reason": "order_cancelled|order_changed|expired"
}
```
**Response**: `200` - Reservation released

### POST /api/inventory/transfer
**Purpose**: Transfer inventory between locations
**Access**: Permission: `inventory:transfer` + organization access
**Request**:
```json
{
  "fromInventoryId": "string",
  "toLocation": {
    "farmId": "string",
    "facility": "string",
    "section": "string?"
  },
  "quantity": "number",
  "transferDate": "datetime",
  "transportMethod": "string",
  "notes": "string"
}
```
**Response**: `201` - Transfer initiated

## Batch & Lot Management

### GET /api/inventory/batches/{batchNumber}
**Purpose**: Get all inventory items in a batch
**Access**: Permission: `inventory:read` + organization access
**Response**: `200` - Batch inventory items with traceability

### POST /api/inventory/batches/{batchNumber}/merge
**Purpose**: Merge multiple batches
**Access**: Permission: `inventory:manage` + organization access
**Request**:
```json
{
  "sourceBatches": ["string"],
  "newBatchNumber": "string",
  "reason": "string"
}
```
**Response**: `200` - Batches merged

### POST /api/inventory/batches/{batchNumber}/split
**Purpose**: Split batch into smaller lots
**Access**: Permission: `inventory:manage` + organization access
**Request**:
```json
{
  "splits": [
    {
      "quantity": "number",
      "newBatchNumber": "string",
      "location": {},
      "notes": "string?"
    }
  ]
}
```
**Response**: `200` - Batch split

### GET /api/inventory/traceability/{inventoryId}
**Purpose**: Get complete traceability chain
**Access**: Permission: `inventory:read` + organization access
**Response**: `200` - From farm to current location with all movements

## Quality Management

### GET /api/inventory/{inventoryId}/quality-tests
**Purpose**: Get quality test results
**Access**: Permission: `inventory:read` + organization access
**Response**: `200` - Quality test history and results

### POST /api/inventory/{inventoryId}/quality-tests
**Purpose**: Add quality test result
**Access**: Permission: `quality:test` + organization access
**Request**:
```json
{
  "testType": "moisture|protein|contamination|pesticide|custom",
  "testDate": "datetime",
  "testedBy": "string", // Lab or person
  "results": {
    "passed": "boolean",
    "values": {},
    "grade": "string?",
    "notes": "string"
  },
  "certificate": "string?", // Document URL
  "nextTestDue": "datetime?"
}
```
**Response**: `201` - Quality test recorded

### PUT /api/inventory/{inventoryId}/quality-grade
**Purpose**: Update quality grade based on assessment
**Access**: Permission: `quality:update` + organization access
**Request**:
```json
{
  "newGrade": "string",
  "reason": "retest|deterioration|upgrade|market_demand",
  "evidence": ["string"],
  "assessedBy": "string"
}
```
**Response**: `200` - Grade updated

## Storage & Facility Management

### GET /api/inventory/facilities
**Purpose**: List storage facilities and capacity
**Access**: Permission: `inventory:read` + farm access
**Response**: `200` - Facilities with current utilization

### GET /api/inventory/facilities/{facilityId}
**Purpose**: Get facility details and contents
**Access**: Permission: `inventory:read` + farm access
**Response**: `200` - Facility inventory and conditions

### POST /api/inventory/facilities/{facilityId}/conditions
**Purpose**: Log facility conditions
**Access**: Permission: `facility:monitor` + farm access
**Request**:
```json
{
  "temperature": "number",
  "humidity": "number",
  "condition": "excellent|good|fair|poor|critical",
  "issues": "string?",
  "recordedBy": "string",
  "recordedAt": "datetime"
}
```
**Response**: `201` - Conditions logged

### GET /api/inventory/storage-optimization
**Purpose**: Get storage optimization recommendations
**Access**: Permission: `inventory:read` + organization access
**Query**: `farmId`, `commodityId`
**Response**: `200` - Recommendations for optimal storage allocation

## Inventory Valuation & Costing

### GET /api/inventory/valuation
**Purpose**: Get inventory valuation summary
**Access**: Permission: `finance:read` + organization access
**Query**: `method` (fifo|lifo|average|current_market), `asOfDate`
**Response**: `200` - Inventory value by commodity and location

### GET /api/inventory/{inventoryId}/cost-basis
**Purpose**: Get detailed cost breakdown
**Access**: Permission: `finance:read` + organization access
**Response**: `200` - Production costs, storage costs, adjustments

### PUT /api/inventory/{inventoryId}/cost-basis
**Purpose**: Update cost basis
**Access**: Permission: `finance:update` + organization access
**Request**:
```json
{
  "newCostBasis": "number",
  "reason": "market_adjustment|revaluation|error_correction",
  "notes": "string",
  "effectiveDate": "datetime"
}
```
**Response**: `200` - Cost basis updated

### GET /api/inventory/aging-report
**Purpose**: Get inventory aging analysis
**Access**: Permission: `analytics:read` + organization access
**Query**: `farmId`, `commodityId`
**Response**: `200` - Inventory age buckets and turnover analysis

## Forecasting & Planning

### GET /api/inventory/demand-forecast
**Purpose**: Get demand forecasting for inventory planning
**Access**: Permission: `planning:read` + organization access
**Query**: `commodityId`, `period`, `farmId`
**Response**: `200` - Predicted demand and recommended inventory levels

### GET /api/inventory/reorder-points
**Purpose**: Get reorder point recommendations
**Access**: Permission: `planning:read` + organization access
**Query**: `commodityId`, `farmId`
**Response**: `200` - Minimum stock levels and reorder triggers

### POST /api/inventory/replenishment-plan
**Purpose**: Generate replenishment plan
**Access**: Permission: `planning:create` + organization access
**Request**:
```json
{
  "commodityId": "string?",
  "farmId": "string?",
  "timeHorizon": "30|60|90|180", // days
  "considerSeasonality": "boolean",
  "includeGrowthPlanning": "boolean"
}
```
**Response**: `200` - Replenishment recommendations with timing

## Inventory Analytics & Reporting

### GET /api/inventory/analytics
**Purpose**: Get inventory analytics dashboard
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `metric`, `farmId`, `commodityId`
**Response**: `200` - Inventory KPIs, turnover, efficiency metrics

### GET /api/inventory/stock-alerts
**Purpose**: Get current stock alerts
**Access**: Permission: `inventory:read` + organization access
**Query**: `severity`, `type`, `farmId`
**Response**: `200` - Low stock, expiry, and quality alerts

### POST /api/inventory/alerts/configure
**Purpose**: Configure inventory alerts
**Access**: Permission: `inventory:configure` + organization access
**Request**:
```json
{
  "lowStockThreshold": "number", // Percentage
  "expiryWarningDays": "number",
  "qualityCheckReminder": "number", // Days
  "notifications": {
    "email": "boolean",
    "sms": "boolean",
    "dashboard": "boolean"
  },
  "recipients": ["string"] // User IDs
}
```
**Response**: `200` - Alert configuration saved

### GET /api/inventory/waste-analysis
**Purpose**: Get waste and loss analysis
**Access**: Permission: `analytics:read` + organization access
**Query**: `period`, `farmId`, `reason`
**Response**: `200` - Waste patterns, costs, and reduction opportunities

### POST /api/inventory/reports
**Purpose**: Generate inventory reports
**Access**: Permission: `reports:create` + organization access
**Request**:
```json
{
  "reportType": "stock_levels|movements|valuation|waste|custom",
  "filters": {
    "dateRange": {"start": "datetime", "end": "datetime"},
    "commodities": ["string"],
    "locations": ["string"],
    "status": ["string"]
  },
  "format": "pdf|excel|csv",
  "includeCharts": "boolean"
}
```
**Response**: `202` - Report generation started
