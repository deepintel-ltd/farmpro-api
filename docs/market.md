# Marketplace & Trading Endpoints

## Market Discovery & Browse

### GET /api/marketplace/commodities
**Purpose**: Browse available commodities in marketplace
**Access**: Permission: `marketplace:browse`
**Query**: `category`, `location`, `priceRange`, `qualityGrade`, `availability`, `organic`, `page`, `limit`
**Response**: `200` - Available commodities with supplier info

### GET /api/marketplace/suppliers
**Purpose**: Browse commodity suppliers
**Access**: Permission: `marketplace:browse`
**Query**: `commodityId`, `location`, `rating`, `verificationStatus`, `deliveryDistance`, `page`, `limit`
**Response**: `200` - Supplier profiles with ratings and capabilities

### GET /api/marketplace/suppliers/{supplierId}
**Purpose**: Get detailed supplier profile
**Access**: Permission: `marketplace:browse`
**Response**: `200` - Supplier details, products, ratings, certifications

### GET /api/marketplace/buyers
**Purpose**: Browse commodity buyers (for suppliers)
**Access**: Permission: `marketplace:browse`
**Query**: `commodityId`, `location`, `orderVolume`, `rating`, `paymentTerms`
**Response**: `200` - Buyer profiles with requirements and history

### POST /api/marketplace/search
**Purpose**: Advanced marketplace search
**Access**: Permission: `marketplace:browse`
**Request**:
```json
{
  "query": "string?", // Text search
  "filters": {
    "commodities": ["string"],
    "suppliers": ["string"],
    "location": {
      "center": {"lat": "number", "lng": "number"},
      "radius": "number", // km
      "regions": ["string"]
    },
    "priceRange": {"min": "number", "max": "number"},
    "quantityRange": {"min": "number", "max": "number"},
    "qualityGrades": ["string"],
    "certifications": ["organic", "fairtrade", "non-gmo"],
    "deliveryOptions": ["pickup", "delivery", "shipping"],
    "paymentTerms": ["cash", "credit", "escrow"],
    "availability": {
      "from": "datetime",
      "to": "datetime"
    }
  },
  "sort": {
    "field": "price|distance|rating|availability",
    "direction": "asc|desc"
  },
  "limit": "number"
}
```
**Response**: `200` - Filtered marketplace results

## Market Intelligence & Pricing

### GET /api/marketplace/price-trends
**Purpose**: Get commodity price trends
**Access**: Permission: `market:research`
**Query**: `commodityId`, `region`, `period`, `grade`
**Response**: `200` - Historical and current pricing data with trends

### GET /api/marketplace/price-alerts
**Purpose**: Get price alert notifications
**Access**: Authenticated
**Response**: `200` - User's active price alerts

### POST /api/marketplace/price-alerts
**Purpose**: Create price alert
**Access**: Authenticated
**Request**:
```json
{
  "commodityId": "string",
  "region": "string?",
  "alertType": "above|below|change",
  "threshold": "number",
  "percentageChange": "number?", // For change alerts
  "notifications": ["email", "sms", "push"]
}
```
**Response**: `201` - Price alert created

### DELETE /api/marketplace/price-alerts/{alertId}
**Purpose**: Remove price alert
**Access**: Authenticated + alert owner
**Response**: `200` - Alert removed

### GET /api/marketplace/market-analysis
**Purpose**: Get market analysis report
**Access**: Permission: `market:research`
**Query**: `commodityId`, `region`, `period`
**Response**: `200` - Supply/demand analysis, price forecasts, market insights

## Demand & Supply Matching

### GET /api/marketplace/demand-forecast
**Purpose**: Get demand forecasting data
**Access**: Permission: `market:research`
**Query**: `commodityId`, `region`, `timeframe`
**Response**: `200` - Predicted demand patterns and seasonality

### GET /api/marketplace/supply-opportunities
**Purpose**: Find supply opportunities for farmers
**Access**: Permission: `marketplace:browse` + supplier role
**Query**: `commodityId`, `location`, `deliveryDate`, `priceRange`
**Response**: `200` - Matching buyer demands and orders

### GET /api/marketplace/buying-opportunities
**Purpose**: Find buying opportunities for buyers
**Access**: Permission: `marketplace:browse` + buyer role
**Query**: `commodityId`, `location`, `qualityGrade`, `priceRange`
**Response**: `200` - Available supplies and inventory

### POST /api/marketplace/match-requests
**Purpose**: Request AI-powered matching
**Access**: Permission: `marketplace:match`
**Request**:
```json
{
  "type": "supply|demand",
  "commodityId": "string",
  "quantity": "number",
  "qualityRequirements": {},
  "location": {"lat": "number", "lng": "number"},
  "maxDistance": "number",
  "deliveryDate": "datetime",
  "priceRange": {"min": "number", "max": "number"},
  "preferences": {
    "certifiedSuppliers": "boolean",
    "verifiedBuyers": "boolean",
    "paymentTerms": ["string"]
  }
}
```
**Response**: `200` - Matching results with compatibility scores

## Contract Templates & Standards

### GET /api/marketplace/contract-templates
**Purpose**: List available contract templates
**Access**: Permission: `contract:access`
**Query**: `commodityId`, `type`, `region`
**Response**: `200` - Standard contract templates

### GET /api/marketplace/contract-templates/{templateId}
**Purpose**: Get contract template details
**Access**: Permission: `contract:access`
**Response**: `200` - Template with terms and customization options

### POST /api/marketplace/contracts/generate
**Purpose**: Generate contract from template
**Access**: Permission: `contract:create`
**Request**:
```json
{
  "templateId": "string",
  "orderId": "string",
  "customizations": {
    "paymentTerms": "string",
    "deliveryTerms": "string",
    "qualityStandards": {},
    "penaltyClauses": {},
    "additionalTerms": "string"
  }
}
```
**Response**: `201` - Generated contract for review

## Market Participation & Listings

### GET /api/marketplace/my-listings
**Purpose**: Get user's marketplace listings
**Access**: Authenticated + supplier role
**Query**: `status`, `commodityId`, `expiryDate`
**Response**: `200` - Active and past listings with performance

### POST /api/marketplace/listings
**Purpose**: Create marketplace listing
**Access**: Permission: `listing:create` + supplier role
**Request**:
```json
{
  "inventoryId": "string",
  "title": "string",
  "description": "string",
  "quantity": "number",
  "unitPrice": "number",
  "priceType": "fixed|negotiable|auction",
  "minQuantity": "number",
  "qualityGrade": "string",
  "certifications": ["string"],
  "availableFrom": "datetime",
  "availableUntil": "datetime",
  "deliveryOptions": ["pickup", "delivery"],
  "deliveryRadius": "number",
  "paymentTerms": ["cash", "credit", "escrow"],
  "isPublic": "boolean",
  "images
