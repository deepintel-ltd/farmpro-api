# Farm Management Endpoints

## Farm CRUD Operations

### GET /api/farms
**Purpose**: List organization's farms
**Access**: Permission: `farm:read`
**Query**: `page`, `limit`, `search`, `isActive`, `location`
**Response**: `200` - Paginated farm list with basic info

### GET /api/farms/{farmId}
**Purpose**: Get detailed farm information
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Complete farm details with areas, seasons, statistics

### POST /api/farms
**Purpose**: Create new farm
**Access**: Permission: `farm:create`
**Request**:
```json
{
  "name": "string",
  "totalArea": "number",
  "location": {
    "address": "string",
    "coordinates": {
      "lat": "number",
      "lng": "number"
    },
    "country": "string",
    "region": "string"
  },
  "timezone": "string",
  "isPublic": "boolean",
  "metadata": {
    "farmType": "string",
    "soilType": "string",
    "climate": "string",
    "certifications": ["string"],
    "irrigationSystem": "string"
  }
}
```
**Response**: `201` - Created farm with ID

### PUT /api/farms/{farmId}
**Purpose**: Update farm details
**Access**: Permission: `farm:update` + farm access
**Request**:
```json
{
  "name": "string",
  "totalArea": "number",
  "location": {},
  "timezone": "string",
  "isActive": "boolean",
  "isPublic": "boolean",
  "metadata": {}
}
```
**Response**: `200` - Updated farm

### DELETE /api/farms/{farmId}
**Purpose**: Soft delete farm
**Access**: Permission: `farm:delete` + farm access
**Response**: `200` - Farm deactivated

## Farm Configuration

### GET /api/farms/{farmId}/settings
**Purpose**: Get farm-specific settings
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Farm configuration

### PUT /api/farms/{farmId}/settings
**Purpose**: Update farm settings
**Access**: Permission: `farm:update` + farm access
**Request**:
```json
{
  "workingHours": {
    "start": "string", // "06:00"
    "end": "string"    // "18:00"
  },
  "units": {
    "area": "hectare|acre",
    "weight": "kg|ton|lb",
    "volume": "liter|gallon",
    "temperature": "celsius|fahrenheit"
  },
  "alerts": {
    "weatherWarnings": "boolean",
    "taskReminders": "boolean",
    "maintenanceAlerts": "boolean"
  },
  "privacy": {
    "shareProductionData": "boolean",
    "shareLocationData": "boolean"
  },
  "integrations": {
    "weatherService": "string",
    "iotSensors": "boolean",
    "satelliteImagery": "boolean"
  }
}
```
**Response**: `200` - Settings updated

## Farm Analytics & Dashboard

### GET /api/farms/{farmId}/dashboard
**Purpose**: Get farm dashboard data
**Access**: Permission: `farm:read` + farm access
**Query**: `period`, `metrics`
**Response**: `200` - Farm overview with KPIs, alerts, and summaries

### GET /api/farms/{farmId}/analytics
**Purpose**: Get detailed farm analytics
**Access**: Permission: `analytics:read` + farm access
**Query**: `period`, `metric`, `areaId`, `cropId`
**Response**: `200` - Farm performance metrics and trends

### GET /api/farms/{farmId}/financial-summary
**Purpose**: Get farm financial overview
**Access**: Permission: `finance:read` + farm access
**Query**: `period`, `category`
**Response**: `200` - Revenue, costs, profitability analysis

### GET /api/farms/{farmId}/production-summary
**Purpose**: Get production metrics
**Access**: Permission: `farm:read` + farm access
**Query**: `season`, `commodity`, `area`
**Response**: `200` - Yield, harvest, quality metrics

## Farm Team & Access Management

### GET /api/farms/{farmId}/team
**Purpose**: Get farm team members
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Users with farm access and their roles

### POST /api/farms/{farmId}/team/{userId}
**Purpose**: Grant user access to farm
**Access**: Permission: `farm:manage` + farm access
**Request**:
```json
{
  "roleId": "string",
  "permissions": ["string"],
  "expiresAt": "datetime?"
}
```
**Response**: `200` - Access granted

### DELETE /api/farms/{farmId}/team/{userId}
**Purpose**: Remove user access from farm
**Access**: Permission: `farm:manage` + farm access
**Response**: `200` - Access revoked

### PUT /api/farms/{farmId}/team/{userId}
**Purpose**: Update user's farm access
**Access**: Permission: `farm:manage` + farm access
**Request**:
```json
{
  "roleId": "string",
  "permissions": ["string"],
  "isActive": "boolean"
}
```
**Response**: `200` - Access updated

## Farm Boundaries & Mapping

### GET /api/farms/{farmId}/boundaries
**Purpose**: Get farm boundary coordinates
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - GeoJSON farm boundaries

### PUT /api/farms/{farmId}/boundaries
**Purpose**: Update farm boundaries
**Access**: Permission: `farm:update` + farm access
**Request**:
```json
{
  "type": "Polygon",
  "coordinates": [[[lng, lat], [lng, lat]]]
}
```
**Response**: `200` - Boundaries updated

### GET /api/farms/{farmId}/map-layers
**Purpose**: Get available map layers
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Available satellite/aerial imagery layers

### GET /api/farms/{farmId}/satellite-imagery
**Purpose**: Get recent satellite imagery
**Access**: Permission: `farm:read` + farm access
**Query**: `date`, `layer`, `resolution`
**Response**: `200` - Imagery URLs and metadata

## Weather & Environmental Data

### GET /api/farms/{farmId}/weather/current
**Purpose**: Get current weather conditions
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Current weather data

### GET /api/farms/{farmId}/weather/forecast
**Purpose**: Get weather forecast
**Access**: Permission: `farm:read` + farm access
**Query**: `days` (1-14)
**Response**: `200` - Weather forecast

### GET /api/farms/{farmId}/weather/history
**Purpose**: Get historical weather data
**Access**: Permission: `farm:read` + farm access
**Query**: `startDate`, `endDate`, `metric`
**Response**: `200` - Historical weather records

### GET /api/farms/{farmId}/alerts
**Purpose**: Get farm alerts and warnings
**Access**: Permission: `farm:read` + farm access
**Query**: `type`, `severity`, `isActive`
**Response**: `200` - Active alerts and notifications

### POST /api/farms/{farmId}/alerts/{alertId}/acknowledge
**Purpose**: Acknowledge farm alert
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Alert acknowledged

## Farm Certifications & Compliance

### GET /api/farms/{farmId}/certifications
**Purpose**: Get farm certifications
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Current certifications and status

### POST /api/farms/{farmId}/certifications
**Purpose**: Add farm certification
**Access**: Permission: `farm:update` + farm access
**Request**:
```json
{
  "type": "organic|fairtrade|gmp|custom",
  "certifyingBody": "string",
  "certificateNumber": "string",
  "issuedDate": "datetime",
  "expiryDate": "datetime",
  "scope": "string",
  "documentUrl": "string"
}
```
**Response**: `201` - Certification added

### PUT /api/farms/{farmId}/certifications/{certId}
**Purpose**: Update certification
**Access**: Permission: `farm:update` + farm access
**Request**:
```json
{
  "status": "active|expired|suspended",
  "expiryDate": "datetime",
  "documentUrl": "string",
  "notes": "string"
}
```
**Response**: `200` - Certification updated

### GET /api/farms/{farmId}/compliance-reports
**Purpose**: Get compliance reports
**Access**: Permission: `compliance:read` + farm access
**Query**: `standard`, `period`, `status`
**Response**: `200` - Compliance reports and audit trails

## Resource Management

### GET /api/farms/{farmId}/resources
**Purpose**: Get farm resources overview
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Equipment, inputs, facilities summary

### GET /api/farms/{farmId}/equipment
**Purpose**: List farm equipment
**Access**: Permission: `farm:read` + farm access
**Query**: `type`, `status`, `maintenance`
**Response**: `200` - Equipment list with status

### POST /api/farms/{farmId}/equipment
**Purpose**: Add equipment to farm
**Access**: Permission: `farm:update` + farm access
**Request**:
```json
{
  "name": "string",
  "type": "tractor|harvester|irrigation|other",
  "model": "string",
  "serialNumber": "string",
  "purchaseDate": "datetime",
  "purchasePrice": "number",
  "status": "operational|maintenance|retired",
  "metadata": {
    "specifications": {},
    "manuals": ["string"],
    "warranty": {}
  }
}
```
**Response**: `201` - Equipment added

### GET /api/farms/{farmId}/facilities
**Purpose**: List farm facilities
**Access**: Permission: `farm:read` + farm access
**Response**: `200` - Storage, processing, office facilities

### POST /api/farms/{farmId}/facilities
**Purpose**: Add facility to farm
**Access**: Permission: `farm:update` + farm access
**Request**:
```json
{
  "name": "string",
  "type": "storage|processing|greenhouse|office|other",
  "location": {
    "lat": "number",
    "lng": "number"
  },
  "capacity": "number",
  "unit": "string",
  "isActive": "boolean"
}
```
**Response**: `201` - Facility added
