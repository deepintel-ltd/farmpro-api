# Users Management Endpoints

## User Profile Management

### GET /api/users/profile
**Purpose**: Get current user's detailed profile
**Access**: Authenticated
**Response**: `200` - Complete user profile with organization, roles, permissions

### PUT /api/users/profile
**Purpose**: Update user profile
**Access**: Authenticated
**Request**:
```json
{
  "name": "string",
  "phone": "string?",
  "avatar": "string?",
  "metadata": {
    "preferences": {},
    "certifications": [],
    "specialties": []
  }
}
```
**Response**: `200` - Updated profile

### POST /api/users/avatar
**Purpose**: Upload user avatar
**Access**: Authenticated
**Request**: `multipart/form-data` - image file
**Response**: `200` - Avatar URL

### DELETE /api/users/avatar
**Purpose**: Remove user avatar
**Access**: Authenticated
**Response**: `200` - Success

## User Management (Admin/Manager)

### GET /api/users
**Purpose**: List organization users with pagination
**Access**: Permission: `user:read`
**Query**: `page`, `limit`, `search`, `role`, `isActive`, `farmId`
**Response**: `200` - Paginated user list

### GET /api/users/{userId}
**Purpose**: Get specific user details
**Access**: Permission: `user:read` + same org
**Response**: `200` - User profile

### POST /api/users
**Purpose**: Create new user in organization
**Access**: Permission: `user:create`
**Request**:
```json
{
  "email": "string",
  "name": "string",
  "phone": "string?",
  "roles": ["string"], // Role IDs
  "sendInvitation": "boolean",
  "metadata": {}
}
```
**Response**: `201` - Created user, invitation sent

### PUT /api/users/{userId}
**Purpose**: Update user details
**Access**: Permission: `user:update` + same org
**Request**:
```json
{
  "name": "string",
  "phone": "string?",
  "isActive": "boolean",
  "metadata": {}
}
```
**Response**: `200` - Updated user

### DELETE /api/users/{userId}
**Purpose**: Soft delete user
**Access**: Permission: `user:delete` + same org
**Response**: `200` - User deactivated

### POST /api/users/{userId}/activate
**Purpose**: Reactivate deactivated user
**Access**: Permission: `user:update` + same org
**Response**: `200` - User activated

## User Role Assignment

### GET /api/users/{userId}/roles
**Purpose**: Get user's roles and permissions
**Access**: Permission: `user:read` + same org
**Response**: `200` - User roles with permissions

### POST /api/users/{userId}/roles
**Purpose**: Assign role to user
**Access**: Permission: `role:assign`
**Request**:
```json
{
  "roleId": "string",
  "farmId": "string?", // Optional scope limitation
  "expiresAt": "datetime?"
}
```
**Response**: `200` - Role assigned

### DELETE /api/users/{userId}/roles/{roleId}
**Purpose**: Remove role from user
**Access**: Permission: `role:assign`
**Query**: `farmId` (if role was farm-scoped)
**Response**: `200` - Role removed

## User Preferences & Settings

### GET /api/users/preferences
**Purpose**: Get user preferences
**Access**: Authenticated (own only)
**Response**: `200` - User preferences object

### PUT /api/users/preferences
**Purpose**: Update user preferences
**Access**: Authenticated (own only)
**Request**:
```json
{
  "theme": "light|dark|auto",
  "language": "en|es|fr",
  "timezone": "string",
  "notifications": {
    "email": "boolean",
    "push": "boolean",
    "sms": "boolean"
  },
  "dashboard": {
    "defaultView": "string",
    "widgets": []
  },
  "mobile": {
    "offlineMode": "boolean",
    "gpsTracking": "boolean"
  }
}
```
**Response**: `200` - Updated preferences

### GET /api/users/notifications/settings
**Purpose**: Get notification preferences
**Access**: Authenticated (own only)
**Response**: `200` - Notification settings

### PUT /api/users/notifications/settings
**Purpose**: Update notification preferences
**Access**: Authenticated (own only)
**Request**:
```json
{
  "channels": {
    "email": "boolean",
    "push": "boolean", 
    "sms": "boolean"
  },
  "events": {
    "activityReminders": "boolean",
    "orderUpdates": "boolean",
    "marketAlerts": "boolean",
    "systemUpdates": "boolean"
  },
  "quiet_hours": {
    "enabled": "boolean",
    "start": "string", // "22:00"
    "end": "string"    // "07:00"
  }
}
```
**Response**: `200` - Settings updated

## User Activity & Analytics

### GET /api/users/activity
**Purpose**: Get user's recent activity
**Access**: Authenticated (own only)
**Query**: `limit`, `days`, `type`
**Response**: `200` - Activity log

### GET /api/users/{userId}/activity
**Purpose**: Get specific user's activity (admin)
**Access**: Permission: `user:read` + same org
**Query**: `limit`, `days`, `type`
**Response**: `200` - User activity log

### GET /api/users/stats
**Purpose**: Get user's performance statistics
**Access**: Authenticated (own only)
**Query**: `period` (week|month|quarter|year)
**Response**: `200` - User performance metrics

### GET /api/users/{userId}/stats
**Purpose**: Get user performance stats (manager)
**Access**: Permission: `user:read` + same org
**Query**: `period`
**Response**: `200` - User statistics

## Multi-Factor Authentication

### GET /api/users/mfa/status
**Purpose**: Get MFA status
**Access**: Authenticated (own only)
**Response**: `200` - MFA status and methods

### POST /api/users/mfa/enable
**Purpose**: Enable MFA
**Access**: Authenticated (own only)
**Request**:
```json
{
  "method": "totp|sms",
  "phone": "string?" // Required for SMS
}
```
**Response**: `200` - MFA setup data (QR code for TOTP)

### POST /api/users/mfa/verify
**Purpose**: Verify and activate MFA
**Access**: Authenticated (own only)
**Request**:
```json
{
  "code": "string",
  "backupCodes": "boolean" // Generate backup codes
}
```
**Response**: `200` - MFA activated, backup codes

### POST /api/users/mfa/disable
**Purpose**: Disable MFA
**Access**: Authenticated (own only)
**Request**:
```json
{
  "password": "string",
  "code": "string"
}
```
**Response**: `200` - MFA disabled

### POST /api/users/mfa/backup-codes
**Purpose**: Regenerate backup codes
**Access**: Authenticated (own only)
**Response**: `200` - New backup codes

## Account Security

### GET /api/users/security/sessions
**Purpose**: List active login sessions
**Access**: Authenticated (own only)
**Response**: `200` - Active sessions with details

### DELETE /api/users/security/sessions/{sessionId}
**Purpose**: Revoke specific session
**Access**: Authenticated (own only)
**Response**: `200` - Session revoked

### GET /api/users/security/devices
**Purpose**: List trusted devices
**Access**: Authenticated (own only)
**Response**: `200` - Trusted device list

### DELETE /api/users/security/devices/{deviceId}
**Purpose**: Remove trusted device
**Access**: Authenticated (own only)
**Response**: `200` - Device removed

### GET /api/users/security/audit-log
**Purpose**: Get security audit log
**Access**: Authenticated (own only)
**Query**: `limit`, `days`
**Response**: `200` - Security events log
