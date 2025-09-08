# Organizations Management Endpoints

## Organization Profile & Settings

### GET /api/organizations/team/stats
**Purpose**: Get team performance statistics
**Access**: Permission: `analytics:read`
**Query**: `period`, `roleId`, `farmId`
**Response**: `200` - Team productivity and performance metrics

## Organization Verification

### POST /api/organizations/request-verification
**Purpose**: Request organization verification
**Access**: Permission: `organization:update`
**Request**:
```json
{
  "documents": ["string"], // Document URLs/IDs
  "businessType": "string",
  "description": "string"
}
```
**Response**: `200` - Verification request submitted

### GET /api/organizations/verification-status
**Purpose**: Check verification status
**Access**: Permission: `organization:read`
**Response**: `200` - Verification status and requirements

## Data & Analytics

### GET /api/organizations/analytics
**Purpose**: Get organization analytics dashboard
**Access**: Permission: `analytics:read`
**Query**: `period`, `metric`, `farmId`
**Response**: `200` - Organization performance metrics

### GET /api/organizations/activity-feed
**Purpose**: Get organization activity feed
**Access**: Permission: `organization:read`
**Query**: `limit`, `days`, `type`, `userId`
**Response**: `200` - Recent organization activities

### GET /api/organizations/compliance-report
**Purpose**: Get compliance and audit report
**Access**: Permission: `compliance:read`
**Query**: `period`, `standard`, `farmId`
**Response**: `200` - Compliance status and reports

## Integration Management

### GET /api/organizations/integrations
**Purpose**: List available integrations
**Access**: Permission: `integration:read`
**Response**: `200` - Available and configured integrations

### POST /api/organizations/integrations/{integrationId}
**Purpose**: Configure integration
**Access**: Permission: `integration:manage`
**Request**:
```json
{
  "config": {},
  "credentials": {},
  "isActive": "boolean"
}
```
**Response**: `200` - Integration configured

### PUT /api/organizations/integrations/{integrationId}
**Purpose**: Update integration settings
**Access**: Permission: `integration:manage`
**Request**:
```json
{
  "config": {},
  "isActive": "boolean"
}
```
**Response**: `200` - Integration updated

### DELETE /api/organizations/integrations/{integrationId}
**Purpose**: Remove integration
**Access**: Permission: `integration:manage`
**Response**: `200` - Integration removed

### GET /api/organizations/integrations/{integrationId}/status
**Purpose**: Check integration status
**Access**: Permission: `integration:read`
**Response**: `200` - Integration health and status

## Export & Backup

### POST /api/organizations/export
**Purpose**: Request organization data export
**Access**: Permission: `data:export`
**Request**:
```json
{
  "dataTypes": ["string"],
  "format": "json|csv|excel",
  "dateRange": {
    "start": "datetime",
    "end": "datetime"
  }
}
```
**Response**: `202` - Export job created

### GET /api/organizations/exports
**Purpose**: List export jobs
**Access**: Permission: `data:export`
**Response**: `200` - Export job history

### GET /api/organizations/exports/{exportId}
**Purpose**: Get export status/download
**Access**: Permission: `data:export`
**Response**: `200` - Export details or file download

### POST /api/organizations/backup
**Purpose**: Create organization backup
**Access**: Permission: `data:backup`
**Request**:
```json
{
  "includeMedia": "boolean",
  "retention": "string" // 30d, 90d, 1y
}
```
**Response**: `202` - Backup job created/organizations/profile
**Purpose**: Get current organization profile
**Access**: Authenticated (organization member)
**Response**: `200` - Organization profile with settings and statistics

### PUT /api/organizations/profile
**Purpose**: Update organization profile
**Access**: Permission: `organization:update`
**Request**:
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": {
    "street": "string",
    "city": "string", 
    "state": "string",
    "zip": "string",
    "country": "string"
  },
  "taxId": "string",
  "website": "string",
  "description": "string"
}
```
**Response**: `200` - Updated organization

### POST /api/organizations/logo
**Purpose**: Upload organization logo
**Access**: Permission: `organization:update`
**Request**: `multipart/form-data` - image file
**Response**: `200` - Logo URL

### GET /api/organizations/settings
**Purpose**: Get organization settings
**Access**: Permission: `organization:read`
**Response**: `200` - Organization configuration

### PUT /api/organizations/settings
**Purpose**: Update organization settings
**Access**: Permission: `organization:update`
**Request**:
```json
{
  "allowCustomRoles": "boolean",
  "requireEmailVerification": "boolean",
  "passwordPolicy": {
    "minLength": "number",
    "requireSpecialChar": "boolean",
    "requireNumbers": "boolean"
  },
  "defaultTimezone": "string",
  "defaultCurrency": "string",
  "features": ["string"],
  "integrations": {},
  "notifications": {
    "emailFromName": "string",
    "emailFromAddress": "string"
  }
}
```
**Response**: `200` - Updated settings

## Organization Management (Platform Admin)

### GET /api/organizations
**Purpose**: List all organizations (platform admin)
**Access**: Platform admin
**Query**: `page`, `limit`, `search`, `type`, `isActive`, `plan`
**Response**: `200` - Paginated organization list

### GET /api/organizations/{orgId}
**Purpose**: Get organization details (admin)
**Access**: Platform admin
**Response**: `200` - Organization with detailed metrics

### POST /api/organizations
**Purpose**: Create new organization (admin)
**Access**: Platform admin
**Request**:
```json
{
  "name": "string",
  "type": "OrganizationType",
  "email": "string",
  "ownerId": "string",
  "plan": "string",
  "maxUsers": "number",
  "maxFarms": "number",
  "features": ["string"]
}
```
**Response**: `201` - Created organization

### PUT /api/organizations/{orgId}
**Purpose**: Update organization (admin)
**Access**: Platform admin
**Request**:
```json
{
  "name": "string",
  "type": "OrganizationType", 
  "isActive": "boolean",
  "isVerified": "boolean",
  "plan": "string",
  "maxUsers": "number",
  "maxFarms": "number",
  "features": ["string"]
}
```
**Response**: `200` - Updated organization

### DELETE /api/organizations/{orgId}
**Purpose**: Soft delete organization
**Access**: Platform admin
**Response**: `200` - Organization deactivated

## Subscription & Billing

### GET /api/organizations/billing
**Purpose**: Get billing information
**Access**: Permission: `billing:read`
**Response**: `200` - Billing details, usage, invoices

### GET /api/organizations/usage
**Purpose**: Get current plan usage
**Access**: Permission: `organization:read`
**Response**: `200` - Usage metrics vs. plan limits

### GET /api/organizations/plans
**Purpose**: List available subscription plans
**Access**: Authenticated
**Response**: `200` - Available plans with features

### POST /api/organizations/subscribe
**Purpose**: Subscribe to a plan
**Access**: Permission: `billing:manage`
**Request**:
```json
{
  "planId": "string",
  "billingCycle": "monthly|yearly",
  "paymentMethod": "string"
}
```
**Response**: `200` - Subscription created

### PUT /api/organizations/subscription
**Purpose**: Update subscription
**Access**: Permission: `billing:manage`
**Request**:
```json
{
  "planId": "string",
  "billingCycle": "monthly|yearly"
}
```
**Response**: `200` - Subscription updated

### GET /api/organizations/invoices
**Purpose**: List invoices
**Access**: Permission: `billing:read`
**Query**: `page`, `limit`, `status`
**Response**: `200` - Invoice history

### GET /api/organizations/invoices/{invoiceId}
**Purpose**: Get invoice details
**Access**: Permission: `billing:read`
**Response**: `200` - Invoice with line items

## Team & User Management

### GET /api/organizations/team
**Purpose**: Get organization team overview
**Access**: Permission: `user:read`
**Response**: `200` - Team members with roles and activity

### GET /api
