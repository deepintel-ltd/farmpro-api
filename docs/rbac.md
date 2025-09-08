# RBAC (Roles & Permissions) Endpoints

## Role Management

### GET /api/rbac/roles
**Purpose**: List available roles for organization
**Access**: Permission: `role:read`
**Query**: `includeSystem`, `isActive`, `level`
**Response**: `200` - Array of roles with permissions

### GET /api/rbac/roles/{roleId}
**Purpose**: Get specific role details
**Access**: Permission: `role:read`
**Response**: `200` - Role with permissions and user count

### POST /api/rbac/roles
**Purpose**: Create custom role
**Access**: Permission: `role:create` + organization.allowCustomRoles
**Request**:
```json
{
  "name": "string",
  "description": "string",
  "level": "number",
  "permissions": [
    {
      "permissionId": "string",
      "granted": "boolean",
      "conditions": {}
    }
  ],
  "metadata": {}
}
```
**Response**: `201` - Created role

### PUT /api/rbac/roles/{roleId}
**Purpose**: Update role details
**Access**: Permission: `role:update` + !isSystemRole
**Request**:
```json
{
  "name": "string",
  "description": "string", 
  "level": "number",
  "isActive": "boolean",
  "metadata": {}
}
```
**Response**: `200` - Updated role

### DELETE /api/rbac/roles/{roleId}
**Purpose**: Delete custom role
**Access**: Permission: `role:delete` + !isSystemRole
**Response**: `200` - Role deleted (if no users assigned)

## Permission Management

### GET /api/rbac/permissions
**Purpose**: List all available permissions
**Access**: Permission: `permission:read`
**Query**: `resource`, `action`, `isSystem`
**Response**: `200` - Array of permissions

### GET /api/rbac/permissions/resources
**Purpose**: Get all resources that can have permissions
**Access**: Permission: `permission:read`
**Response**: `200` - Array of resource types

### POST /api/rbac/permissions
**Purpose**: Create custom permission (system admin only)
**Access**: Platform admin
**Request**:
```json
{
  "resource": "string",
  "action": "string", 
  "conditions": {},
  "description": "string"
}
```
**Response**: `201` - Created permission

## Role Permission Assignment

### GET /api/rbac/roles/{roleId}/permissions
**Purpose**: Get role's permissions
**Access**: Permission: `role:read`
**Response**: `200` - Array of granted/denied permissions

### POST /api/rbac/roles/{roleId}/permissions
**Purpose**: Assign permission to role
**Access**: Permission: `role:update`
**Request**:
```json
{
  "permissionId": "string",
  "granted": "boolean",
  "conditions": {}
}
```
**Response**: `200` - Permission assigned

### PUT /api/rbac/roles/{roleId}/permissions/{permissionId}
**Purpose**: Update role permission
**Access**: Permission: `role:update`
**Request**:
```json
{
  "granted": "boolean",
  "conditions": {}
}
```
**Response**: `200` - Permission updated

### DELETE /api/rbac/roles/{roleId}/permissions/{permissionId}
**Purpose**: Remove permission from role
**Access**: Permission: `role:update`
**Response**: `200` - Permission removed

## User Role Management

### GET /api/rbac/users/{userId}/roles
**Purpose**: Get user's roles with details
**Access**: Permission: `user:read` + same org
**Response**: `200` - User roles with scope and expiration

### POST /api/rbac/users/{userId}/roles/{roleId}
**Purpose**: Assign role to user
**Access**: Permission: `role:assign`
**Request**:
```json
{
  "farmId": "string?",
  "expiresAt": "datetime?",
  "metadata": {}
}
```
**Response**: `200` - Role assigned

### PUT /api/rbac/users/{userId}/roles/{roleId}
**Purpose**: Update user role assignment
**Access**: Permission: `role:assign`
**Request**:
```json
{
  "farmId": "string?",
  "expiresAt": "datetime?",
  "isActive": "boolean",
  "metadata": {}
}
```
**Response**: `200` - Role assignment updated

### DELETE /api/rbac/users/{userId}/roles/{roleId}
**Purpose**: Remove role from user
**Access**: Permission: `role:assign`
**Query**: `farmId` (if role is farm-scoped)
**Response**: `200` - Role removed

## Permission Checking & Authorization

### POST /api/rbac/check-permission
**Purpose**: Check if user has specific permission
**Access**: Authenticated
**Request**:
```json
{
  "resource": "string",
  "action": "string",
  "resourceId": "string?",
  "conditions": {}
}
```
**Response**: `200` - Permission granted/denied with reason

### POST /api/rbac/check-permissions
**Purpose**: Batch check multiple permissions
**Access**: Authenticated
**Request**:
```json
{
  "permissions": [
    {
      "resource": "string",
      "action": "string", 
      "resourceId": "string?",
      "conditions": {}
    }
  ]
}
```
**Response**: `200` - Array of permission results

### GET /api/rbac/user-permissions
**Purpose**: Get all effective permissions for current user
**Access**: Authenticated
**Query**: `resource`, `farmId`
**Response**: `200` - User's effective permissions

### GET /api/rbac/users/{userId}/permissions
**Purpose**: Get user's effective permissions
**Access**: Permission: `user:read` + same org
**Query**: `resource`, `farmId`
**Response**: `200` - User's effective permissions

## Role Templates & Presets

### GET /api/rbac/role-templates
**Purpose**: Get role templates for quick setup
**Access**: Permission: `role:read`
**Query**: `organizationType`
**Response**: `200` - Available role templates

### POST /api/rbac/role-templates/{templateId}/apply
**Purpose**: Create role from template
**Access**: Permission: `role:create`
**Request**:
```json
{
  "name": "string",
  "customizations": {
    "permissions": [],
    "metadata": {}
  }
}
```
**Response**: `201` - Role created from template

## Role Hierarchy & Inheritance

### GET /api/rbac/role-hierarchy
**Purpose**: Get organization's role hierarchy
**Access**: Permission: `role:read`
**Response**: `200` - Role hierarchy tree

### POST /api/rbac/roles/{roleId}/inherit/{parentRoleId}
**Purpose**: Set role inheritance
**Access**: Permission: `role:update`
**Response**: `200` - Inheritance set

### DELETE /api/rbac/roles/{roleId}/inherit/{parentRoleId}
**Purpose**: Remove role inheritance
**Access**: Permission: `role:update`
**Response**: `200` - Inheritance removed

## Access Control Analytics

### GET /api/rbac/access-analytics
**Purpose**: Get access control analytics
**Access**: Permission: `analytics:read`
**Query**: `period`, `userId`, `resource`
**Response**: `200` - Access patterns and usage

### GET /api/rbac/permission-usage
**Purpose**: Get permission usage statistics
**Access**: Permission: `analytics:read`
**Query**: `period`, `roleId`
**Response**: `200` - Permission usage stats

### GET /api/rbac/role-effectiveness
**Purpose**: Analyze role effectiveness
**Access**: Permission: `analytics:read`
**Query**: `roleId`, `period`
**Response**: `200` - Role utilization and effectiveness

## Bulk Operations

### POST /api/rbac/bulk/assign-roles
**Purpose**: Assign roles to multiple users
**Access**: Permission: `role:assign`
**Request**:
```json
{
  "userIds": ["string"],
  "roleId": "string",
  "farmId": "string?",
  "expiresAt": "datetime?"
}
```
**Response**: `200` - Bulk assignment results

### POST /api/rbac/bulk/remove-roles
**Purpose**: Remove roles from multiple users
**Access**: Permission: `role:assign`
**Request**:
```json
{
  "userIds": ["string"],
  "roleId": "string",
  "farmId": "string?"
}
```
**Response**: `200` - Bulk removal results

### POST /api/rbac/bulk/update-permissions
**Purpose**: Update permissions for role
**Access**: Permission: `role:update`
**Request**:
```json
{
  "roleId": "string",
  "permissions": [
    {
      "permissionId": "string",
      "granted": "boolean",
      "conditions": {}
    }
  ]
}
```
**Response**: `200` - Bulk update results
