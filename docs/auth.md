# Authentication Endpoints

## Auth Flow & JWT Management

### POST /api/auth/register
**Purpose**: Register new user with organization
**Access**: Public
**Request**:
```json
{
  "email": "string",
  "password": "string", 
  "name": "string",
  "phone": "string?",
  "organizationName": "string",
  "organizationType": "FARM_OPERATION|COMMODITY_TRADER|FOOD_PROCESSOR|LOGISTICS_PROVIDER|COOPERATIVE|OTHER",
  "inviteCode": "string?" // Optional for invited users
}
```
**Response**: `201` - User created, JWT tokens

### POST /api/auth/login
**Purpose**: Authenticate user and get tokens
**Access**: Public
**Request**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Response**: `200` - JWT access + refresh tokens, user profile

### POST /api/auth/refresh
**Purpose**: Refresh JWT access token
**Access**: Public (with refresh token)
**Request**:
```json
{
  "refreshToken": "string"
}
```
**Response**: `200` - New access token

### POST /api/auth/logout
**Purpose**: Invalidate refresh token
**Access**: Authenticated
**Response**: `200` - Success message

### POST /api/auth/logout-all
**Purpose**: Invalidate all refresh tokens for user
**Access**: Authenticated  
**Response**: `200` - Success message

## Password Management

### POST /api/auth/forgot-password
**Purpose**: Request password reset email
**Access**: Public
**Request**:
```json
{
  "email": "string"
}
```
**Response**: `200` - Email sent confirmation

### POST /api/auth/reset-password
**Purpose**: Reset password with token
**Access**: Public
**Request**:
```json
{
  "token": "string",
  "newPassword": "string"
}
```
**Response**: `200` - Password updated

### POST /api/auth/change-password
**Purpose**: Change password for authenticated user
**Access**: Authenticated
**Request**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```
**Response**: `200` - Password updated

## Email & Account Verification

### POST /api/auth/send-verification
**Purpose**: Send email verification
**Access**: Authenticated
**Response**: `200` - Email sent

### POST /api/auth/verify-email
**Purpose**: Verify email with token
**Access**: Public
**Request**:
```json
{
  "token": "string"
}
```
**Response**: `200` - Email verified

## OAuth Integration

### GET /api/auth/google
**Purpose**: Initiate Google OAuth
**Access**: Public
**Response**: `302` - Redirect to Google

### GET /api/auth/google/callback
**Purpose**: Handle Google OAuth callback
**Access**: Public
**Response**: `302` - Redirect with tokens

### GET /api/auth/github
**Purpose**: Initiate GitHub OAuth  
**Access**: Public
**Response**: `302` - Redirect to GitHub

### GET /api/auth/github/callback
**Purpose**: Handle GitHub OAuth callback
**Access**: Public
**Response**: `302` - Redirect with tokens

## Session Management

### GET /api/auth/me
**Purpose**: Get current user profile
**Access**: Authenticated
**Response**: `200` - User profile with organization and roles

### POST /api/auth/validate-token
**Purpose**: Validate JWT token
**Access**: Public (with token)
**Request**:
```json
{
  "token": "string"
}
```
**Response**: `200` - Token valid, user info

### GET /api/auth/sessions
**Purpose**: List active sessions
**Access**: Authenticated
**Response**: `200` - Array of active sessions

### DELETE /api/auth/sessions/{sessionId}
**Purpose**: Revoke specific session
**Access**: Authenticated
**Response**: `200` - Session revoked
