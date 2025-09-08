# Farm Activities Management Endpoints

## Activity CRUD Operations

### GET /api/activities
**Purpose**: List farm activities with filtering
**Access**: Permission: `activity:read` + farm access
**Query**: `farmId`, `areaId`, `cropCycleId`, `type`, `status`, `assignedTo`, `dateRange`, `page`, `limit`
**Response**: `200` - Paginated activity list

### GET /api/activities/{activityId}
**Purpose**: Get detailed activity information
**Access**: Permission: `activity:read` + farm access
**Response**: `200` - Complete activity details with media, costs, progress

### POST /api/activities
**Purpose**: Create new farm activity
**Access**: Permission: `activity:create` + farm access
**Request**:
```json
{
  "farmId": "string",
  "areaId": "string?",
  "cropCycleId": "string?",
  "type": "LAND_PREP|PLANTING|FERTILIZING|IRRIGATION|PEST_CONTROL|HARVESTING|MAINTENANCE|MONITORING|OTHER",
  "name": "string",
  "description": "string",
  "scheduledAt": "datetime",
  "estimatedDuration": "number", // hours
  "priority": "low|normal|high|urgent",
  "assignedTo": ["string"], // User IDs
  "resources": [
    {
      "type": "equipment|labor|material",
      "resourceId": "string",
      "quantity": "number",
      "unit": "string"
    }
  ],
  "instructions": "string",
  "safetyNotes": "string",
  "estimatedCost": "number",
  "metadata": {}
}
```
**Response**: `201` - Created activity

### PUT /api/activities/{activityId}
**Purpose**: Update activity details
**Access**: Permission: `activity:update` + farm access + (own activity OR manager)
**Request**:
```json
{
  "name": "string",
  "description": "string",
  "scheduledAt": "datetime",
  "priority": "string",
  "assignedTo": ["string"],
  "instructions": "string",
  "estimatedCost": "number",
  "metadata": {}
}
```
**Response**: `200` - Updated activity

### DELETE /api/activities/{activityId}
**Purpose**: Cancel/delete activity
**Access**: Permission: `activity:delete` + farm access + (own activity OR manager)
**Response**: `200` - Activity cancelled

## Activity Execution & Progress

### POST /api/activities/{activityId}/start
**Purpose**: Start activity execution
**Access**: Permission: `activity:execute` + assigned to activity
**Request**:
```json
{
  "location": {
    "lat": "number",
    "lng": "number"
  },
  "notes": "string?",
  "actualResources": [
    {
      "type": "string",
      "resourceId": "string", 
      "quantity": "number"
    }
  ]
}
```
**Response**: `200` - Activity started

### PUT /api/activities/{activityId}/progress
**Purpose**: Update activity progress
**Access**: Permission: `activity:execute` + assigned to activity
**Request**:
```json
{
  "percentComplete": "number", // 0-100
  "notes": "string?",
  "issues": "string?",
  "resourceUsage": [
    {
      "resourceId": "string",
      "quantityUsed": "number"
    }
  ]
}
```
**Response**: `200` - Progress updated

### POST /api/activities/{activityId}/complete
**Purpose**: Mark activity as completed
**Access**: Permission: `activity:execute` + assigned to activity
**Request**:
```json
{
  "completedAt": "datetime",
  "results": {
    "quality": "excellent|good|fair|poor",
    "quantityAchieved": "number",
    "notes": "string"
  },
  "actualCost": "number",
  "resourcesUsed": [],
  "issues": "string?",
  "recommendations": "string?"
}
```
**Response**: `200` - Activity completed

### POST /api/activities/{activityId}/pause
**Purpose**: Pause activity execution
**Access**: Permission: `activity:execute` + assigned to activity
**Request**:
```json
{
  "reason": "weather|equipment|break|other",
  "notes": "string?",
  "estimatedResumeTime": "datetime?"
}
```
**Response**: `200` - Activity paused

### POST /api/activities/{activityId}/resume
**Purpose**: Resume paused activity
**Access**: Permission: `activity:execute` + assigned to activity
**Response**: `200` - Activity resumed

## Activity Templates & Planning

### GET /api/activities/templates
**Purpose**: List activity templates
**Access**: Permission: `activity:read`
**Query**: `type`, `cropType`, `farmType`
**Response**: `200` - Available activity templates

### GET /api/activities/templates/{templateId}
**Purpose**: Get activity template details
**Access**: Permission: `activity:read`
**Response**: `200` - Template with default values and instructions

### POST /api/activities/templates
**Purpose**: Create custom activity template
**Access**: Permission: `template:create`
**Request**:
```json
{
  "name": "string",
  "type": "ActivityType",
  "description": "string",
  "defaultDuration": "number",
  "defaultResources": [],
  "instructions": "string",
  "safetyNotes": "string",
  "applicableCrops": ["string"],
  "metadata": {}
}
```
**Response**: `201` - Template created

### POST /api/activities/from-template/{templateId}
**Purpose**: Create activity from template
**Access**: Permission: `activity:create` + farm access
**Request**:
```json
{
  "farmId": "string",
  "areaId": "string?",
  "cropCycleId": "string?",
  "scheduledAt": "datetime",
  "customizations": {
    "name": "string?",
    "assignedTo": ["string"],
    "resources": []
  }
}
```
**Response**: `201` - Activity created from template

## Activity Scheduling & Calendar

### GET /api/activities/calendar
**Purpose**: Get activities in calendar format
**Access**: Permission: `activity:read` + farm access
**Query**: `farmId`, `startDate`, `endDate`, `userId`, `view` (day|week|month)
**Response**: `200` - Calendar view of activities

### GET /api/activities/schedule/conflicts
**Purpose**: Check for scheduling conflicts
**Access**: Permission: `activity:read` + farm access
**Query**: `farmId`, `resourceId`, `startTime`, `endTime`
**Response**: `200` - Conflicting activities and resources

### POST /api/activities/bulk-schedule
**Purpose**: Schedule multiple activities
**Access**: Permission: `activity:create` + farm access
**Request**:
```json
{
  "activities": [
    {
      "templateId": "string",
      "scheduledAt": "datetime",
      "farmId": "string",
      "areaId": "string?",
      "customizations": {}
    }
  ],
  "resolveConflicts": "auto|manual"
}
```
**Response**: `201` - Activities scheduled with conflict resolution

### GET /api/activities/workload
**Purpose**: Get team workload analysis
**Access**: Permission: `analytics:read` + farm access
**Query**: `farmId`, `startDate`, `endDate`, `userId`
**Response**: `200` - Workload distribution and capacity analysis

## Activity Assignments & Team Management

### GET /api/activities/my-tasks
**Purpose**: Get current user's assigned activities
**Access**: Authenticated
**Query**: `status`, `farmId`, `priority`, `dueDate`
**Response**: `200` - User's task list

### PUT /api/activities/{activityId}/assign
**Purpose**: Assign activity to users
**Access**: Permission: `activity:assign` + farm access
**Request**:
```json
{
  "assignedTo": ["string"], // User IDs
  "reassignReason": "string?",
  "notifyUsers": "boolean"
}
```
**Response**: `200` - Assignment updated

### POST /api/activities/{activityId}/request-help
**Purpose**: Request additional help for activity
**Access**: Permission: `activity:execute` + assigned to activity
**Request**:
```json
{
  "message": "string",
  "skillsNeeded": ["string"],
  "urgency": "low|normal|high"
}
```
**Response**: `200` - Help request sent

### GET /api/activities/team-performance
**Purpose**: Get team performance metrics
**Access**: Permission: `analytics:read` + farm access
**Query**: `farmId`, `period`, `userId`, `metric`
**Response**: `200` - Team efficiency and performance data

## Activity Cost Tracking

### GET /api/activities/{activityId}/costs
**Purpose**: Get activity cost breakdown
**Access**: Permission: `finance:read` + farm access
**Response**: `200` - Detailed cost analysis

### POST /api/activities/{activityId}/costs
**Purpose**: Add cost entry to activity
**Access**: Permission: `activity:execute` + assigned to activity
**Request**:
```json
{
  "type": "labor|equipment|material|other",
  "description": "string",
  "amount": "number",
  "quantity": "number?",
  "unit": "string?",
  "receipt": "string?", // File URL
  "vendor": "string?"
}
```
**Response**: `201` - Cost entry added

### PUT /api/activities/{activityId}/costs/{costId}
**Purpose**: Update cost entry
**Access**: Permission: `finance:update` + farm access
**Request**:
```json
{
  "amount": "number",
  "description": "string",
  "receipt": "string?"
}
```
**Response**: `200` - Cost updated

## Activity Documentation & Media

### GET /api/activities/{activityId}/media
**Purpose**: Get activity photos and documents
**Access**: Permission: `activity:read` + farm access
**Response**: `200` - Media files associated with activity

### POST /api/activities/{activityId}/media
**Purpose**: Upload activity media
**Access**: Permission: `activity:execute` + assigned to activity
**Request**: `multipart/form-data` with metadata
**Response**: `201` - Media uploaded

### GET /api/activities/{activityId}/notes
**Purpose**: Get activity notes and observations
**Access**: Permission: `activity:read` + farm access
**Response**: `200` - Activity notes chronologically

### POST /api/activities/{activityId}/notes
**Purpose**: Add note to activity
**Access**: Permission: `activity:execute` + assigned to activity
**Request**:
```json
{
  "content": "string",
  "type": "observation|issue|recommendation|general",
  "isPrivate": "boolean",
  "attachments": ["string"]
}
```
**Response**: `201` - Note added

## Activity Analytics & Reporting

### GET /api/activities/analytics
**Purpose**: Get activity performance analytics
**Access**: Permission: `analytics:read` + farm access
**Query**: `farmId`, `period`, `type`, `metric`
**Response**: `200` - Activity efficiency and performance metrics

### GET /api/activities/completion-rates
**Purpose**: Get activity completion statistics
**Access**: Permission: `analytics:read` + farm access
**Query**: `farmId`, `period`, `userId`, `type`
**Response**: `200` - Completion rate analysis

### GET /api/activities/cost-analysis
**Purpose**: Get activity cost analysis
**Access**: Permission: `finance:read` + farm access
**Query**: `farmId`, `period`, `type`, `comparison`
**Response**: `200` - Cost trends and variance analysis

### POST /api/activities/reports
**Purpose**: Generate custom activity report
**Access**: Permission: `reports:create` + farm access
**Request**:
```json
{
  "reportType": "efficiency|cost|completion|custom",
  "filters": {
    "farmId": "string",
    "dateRange": {},
    "activityTypes": ["string"],
    "userId": "string?"
  },
  "format": "pdf|excel|csv",
  "includeCharts": "boolean"
}
```
**Response**: `202` - Report generation started
