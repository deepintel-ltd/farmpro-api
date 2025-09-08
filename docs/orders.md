# Order Management Endpoints

## Order CRUD Operations

### GET /api/orders
**Purpose**: List orders with filtering and pagination
**Access**: Permission: `order:read` + organization access
**Query**: `type` (BUY|SELL), `status`, `buyerOrgId`, `supplierOrgId`, `commodityId`, `dateRange`, `page`, `limit`
**Response**: `200` - Paginated order list

### GET /api/orders/{orderId}
**Purpose**: Get detailed order information
**Access**: Permission: `order:read` + order party access
**Response**: `200` - Complete order details with items, messages, documents

### POST /api/orders
**Purpose**: Create new order
**Access**: Permission: `order:create`
**Request**:
```json
{
  "type": "BUY|SELL",
  "title": "string",
  "description": "string",
  "deliveryDate": "datetime",
  "deliveryAddress": {
    "street": "string",
    "city": "string", 
    "state": "string",
    "zip": "string",
    "coordinates": {"lat": "number", "lng": "number"}
  },
  "items": [
    {
      "commodityId": "string",
      "inventoryId": "string?", // For SELL orders
      "quantity": "number",
      "unit": "string",
      "qualityRequirements": {
        "grade": "string",
        "specifications": {},
        "certifications": ["string"]
      },
      "unitPrice": "number?",
      "priceType": "fixed|negotiable|market"
    }
  ],
  "paymentTerms": "string",
  "specialInstructions": "string",
  "isPublic": "boolean", // Visible in marketplace
  "metadata": {}
}
```
**Response**: `201` - Created order

### PUT /api/orders/{orderId}
**Purpose**: Update order details (draft only)
**Access**: Permission: `order:update` + order creator
**Request**:
```json
{
  "title": "string",
  "description": "string",
  "deliveryDate": "datetime",
  "deliveryAddress": {},
  "paymentTerms": "string",
  "specialInstructions": "string",
  "isPublic": "boolean"
}
```
**Response**: `200` - Updated order

### DELETE /api/orders/{orderId}
**Purpose**: Cancel order
**Access**: Permission: `order:delete` + order creator + status=DRAFT
**Response**: `200` - Order cancelled

## Order Lifecycle Management

### POST /api/orders/{orderId}/publish
**Purpose**: Publish draft order to marketplace
**Access**: Permission: `order:publish` + order creator
**Response**: `200` - Order published

### POST /api/orders/{orderId}/accept
**Purpose**: Accept order as supplier/buyer
**Access**: Permission: `order:accept` + not order creator
**Request**:
```json
{
  "message": "string?",
  "proposedChanges": {
    "items": [
      {
        "itemId": "string",
        "unitPrice": "number?",
        "quantity": "number?",
        "deliveryDate": "datetime?"
      }
    ]
  },
  "requiresNegotiation": "boolean"
}
```
**Response**: `200` - Order accepted or negotiation started

### POST /api/orders/{orderId}/reject
**Purpose**: Reject order
**Access**: Permission: `order:respond` + order party
**Request**:
```json
{
  "reason": "price|quantity|timing|quality|other",
  "message": "string"
}
```
**Response**: `200` - Order rejected

### POST /api/orders/{orderId}/counter-offer
**Purpose**: Make counter offer
**Access**: Permission: `order:negotiate` + order party
**Request**:
```json
{
  "message": "string",
  "changes": {
    "totalAmount": "number?",
    "deliveryDate": "datetime?",
    "items": [
      {
        "itemId": "string",
        "unitPrice": "number?",
        "quantity": "number?"
      }
    ]
  },
  "expiresAt": "datetime"
}
```
**Response**: `200` - Counter offer created

### POST /api/orders/{orderId}/confirm
**Purpose**: Confirm order agreement and move to production
**Access**: Permission: `order:confirm` + order creator
**Response**: `200` - Order confirmed, contracts generated

### POST /api/orders/{orderId}/start-fulfillment
**Purpose**: Begin order fulfillment process
**Access**: Permission: `order:fulfill` + supplier organization
**Request**:
```json
{
  "estimatedCompletionDate": "datetime",
  "notes": "string",
  "trackingInfo": {
    "batchNumbers": ["string"],
    "qualityTestResults": {},
    "processingNotes": "string"
  }
}
```
**Response**: `200` - Fulfillment started

### POST /api/orders/{orderId}/complete
**Purpose**: Mark order as completed
**Access**: Permission: `order:complete` + order parties
**Request**:
```json
{
  "deliveryConfirmation": {
    "deliveredAt": "datetime",
    "receivedBy": "string",
    "condition": "excellent|good|acceptable|damaged",
    "notes": "string"
  },
  "qualityAssessment": {
    "meetsSpecifications": "boolean",
    "actualGrade": "string",
    "issues": "string?"
  }
}
```
**Response**: `200` - Order completed

## Order Item Management

### GET /api/orders/{orderId}/items
**Purpose**: Get order items with detailed specifications
**Access**: Permission: `order:read` + order party access
**Response**: `200` - Order items with commodity details

### POST /api/orders/{orderId}/items
**Purpose**: Add item to draft order
**Access**: Permission: `order:update` + order creator + status=DRAFT
**Request**:
```json
{
  "commodityId": "string",
  "inventoryId": "string?",
  "quantity": "number", 
  "unit": "string",
  "qualityRequirements": {},
  "unitPrice": "number?",
  "priceType": "fixed|negotiable|market"
}
```
**Response**: `201` - Item added to order

### PUT /api/orders/{orderId}/items/{itemId}
**Purpose**: Update order item
**Access**: Permission: `order:update` + order creator + status=DRAFT
**Request**:
```json
{
  "quantity": "number",
  "qualityRequirements": {},
  "unitPrice": "number?",
  "notes": "string?"
}
```
**Response**: `200` - Item updated

### DELETE /api/orders/{orderId}/items/{itemId}
**Purpose**: Remove item from order
**Access**: Permission: `order:update` + order creator + status=DRAFT
**Response**: `200` - Item removed

## Order Search & Discovery

### GET /api/orders/marketplace
**Purpose**: Browse public orders in marketplace
**Access**: Permission: `marketplace:browse`
**Query**: `type`, `commodityId`, `location`, `priceRange`, `deliveryDate`, `qualityGrade`, `distance`, `page`, `limit`
**Response**: `200` - Public orders matching criteria

### GET /api/orders/marketplace/{orderId}
**Purpose**: Get marketplace order details
**Access**: Permission: `marketplace:browse`
**Response**: `200` - Public order information

### POST /api/orders/search
**Purpose**: Advanced order search
**Access**: Permission: `order:read`
**Request**:
```json
{
  "filters": {
    "commodities": ["string"],
    "location": {
      "center": {"lat": "number", "lng": "number"},
      "radius": "number"
    },
    "priceRange": {"min": "number", "max": "number"},
    "quantityRange": {"min": "number", "max": "number"},
    "deliveryWindow": {"start": "datetime", "end": "datetime"},
    "qualityGrades": ["string"],
    "certifications": ["string"],
    "supplierRatings": {"min": "number"}
  },
  "sort": {
    "field": "price|distance|rating|deliveryDate",
    "direction": "asc|desc"
  }
}
```
**Response**: `200` - Filtered and sorted order results

### GET /api/orders/recommendations
**Purpose**: Get personalized order recommendations
**Access**: Permission: `order:read`
**Query**: `type`, `limit`
**Response**: `200` - AI-recommended orders based on history and preferences

## Order Communication

### GET /api/orders/{orderId}/messages
**Purpose**: Get order conversation history
**Access**: Permission: `order:read` + order party access
**Query**: `page`, `limit`
**Response**: `200` - Message history between parties

### POST /api/orders/{orderId}/messages
**Purpose**: Send message about order
**Access**: Permission: `order:communicate` + order party access
**Request**:
```json
{
  "content": "string",
  "type": "inquiry|negotiation|update|issue|general",
  "attachments": ["string"],
  "isUrgent": "boolean"
}
```
**Response**: `201` - Message sent

### PUT /api/orders/{orderId}/messages/{messageId}/read
**Purpose**: Mark message as read
**Access**: Permission: `order:communicate` + order party access
**Response**: `200` - Message marked as read

## Order Documents & Contracts

### GET /api/orders/{orderId}/documents
**Purpose**: Get order-related documents
**Access**: Permission: `order:read` + order party access
**Response**: `200` - Contracts, invoices, certificates, receipts

### POST /api/orders/{orderId}/documents
**Purpose**: Upload document to order
**Access**: Permission: `order:manage` + order party access
**Request**: `multipart/form-data` with document and metadata
```json
{
  "type": "contract|invoice|certificate|receipt|quality_report|other",
  "name": "string",
  "description": "string",
  "isRequired": "boolean"
}
```
**Response**: `201` - Document uploaded

### GET /api/orders/{orderId}/contract
**Purpose**: Get auto-generated contract
**Access**: Permission: `order:read` + order party access
**Response**: `200` - Contract PDF and terms

### POST /api/orders/{orderId}/contract/sign
**Purpose**: Digitally sign order contract
**Access**: Permission: `order:sign` + order party access
**Request**:
```json
{
  "signature": "string", // Digital signature
  "signedAt": "datetime",
  "ipAddress": "string"
}
```
**Response**: `200` - Contract signed

## Order Tracking & Status

### GET /api/orders/{orderId}/timeline
**Purpose**: Get order status timeline
**Access**: Permission: `order:read` + order party access
**Response**: `200` - Chronological order events and status changes

### GET /api/orders/{orderId}/tracking
**Purpose**: Get order tracking information
**Access**: Permission: `order:track` + order party access
**Response**: `200` - Real-time order progress and location data

### POST /api/orders/{orderId}/status-update
**Purpose**: Add status update to order
**Access**: Permission: `order:update` + order party access
**Request**:
```json
{
  "status": "string",
  "message": "string",
  "location": {"lat": "number", "lng": "number"},
  "estimatedCompletion": "datetime?",
  "attachments": ["string"]
}
```
**Response**: `201` - Status update added

## Order Analytics & Reporting

### GET /api/orders/analytics
**Purpose**: Get order analytics dashboard
**Access**: Permission: `analytics:read`
**Query**: `period`, `type`, `status`, `commodityId`
**Response**: `200` - Order volume, success rates, performance metrics

### GET /api/orders/financial-summary
**Purpose**: Get financial summary of orders
**Access**: Permission: `finance:read`
**Query**: `period`, `type`, `status`
**Response**: `200` - Revenue, costs, margins by orders

### GET /api/orders/performance-metrics
**Purpose**: Get order performance KPIs
**Access**: Permission: `analytics:read`
**Query**: `period`, `metric`
**Response**: `200` - Completion rates, cycle times, customer satisfaction

### POST /api/orders/reports
**Purpose**: Generate custom order report
**Access**: Permission: `reports:create`
**Request**:
```json
{
  "reportType": "financial|performance|compliance|custom",
  "filters": {
    "dateRange": {"start": "datetime", "end": "datetime"},
    "status": ["string"],
    "commodities": ["string"],
    "partners": ["string"]
  },
  "format": "pdf|excel|csv",
  "includeCharts": "boolean"
}
```
**Response**: `202` - Report generation started

## Order Disputes & Resolution

### POST /api/orders/{orderId}/dispute
**Purpose**: Raise dispute about order
**Access**: Permission: `order:dispute` + order party access
**Request**:
```json
{
  "type": "quality|delivery|payment|other",
  "description": "string",
  "evidence": ["string"], // File URLs
  "requestedResolution": "refund|replacement|discount|other",
  "severity": "low|medium|high"
}
```
**Response**: `201` - Dispute created

### GET /api/orders/{orderId}/disputes
**Purpose**: Get order disputes
**Access**: Permission: `order:read` + order party access
**Response**: `200` - Dispute history and status

### POST /api/orders/{orderId}/disputes/{disputeId}/respond
**Purpose**: Respond to dispute
**Access**: Permission: `order:dispute` + order party access
**Request**:
```json
{
  "response": "string",
  "evidence": ["string"],
  "proposedResolution": "string"
}
```
**Response**: `201` - Dispute response added

### POST /api/orders/{orderId}/disputes/{disputeId}/resolve
**Purpose**: Resolve dispute
**Access**: Permission: `dispute:resolve` + order party agreement
**Request**:
```json
{
  "resolution": "string",
  "compensation": "number?",
  "terms": "string"
}
```
**Response**: `200` - Dispute resolved
