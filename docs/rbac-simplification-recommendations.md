# RBAC Over-Engineering Analysis & Simplification Recommendations

## Executive Summary

The current plan-based RBAC implementation suffers from significant over-engineering that violates the project's preference for simple, maintainable code. The system implements 4 separate authorization layers, maintains duplicate role systems, and performs redundant database queries for every request. This analysis provides specific recommendations to reduce complexity by ~70% while maintaining the same functionality.

## Current Architecture Problems

### 1. Excessive Layering of Authorization Systems

**Current Implementation:**
```typescript
// Layer 1: Feature Access Guard
@Secured(FEATURES.RBAC)
@RequireFeature('rbac')

// Layer 2: Permission Guard  
@RequirePermission(...PERMISSIONS.RBAC.READ)

// Layer 3: Role Level Guard
@RequireRoleLevel(50)

// Layer 4: Organization Isolation Guard
// (implicitly applied)
```

**Problems:**
- Each request goes through multiple guards
- 4+ database queries per request
- Complex debugging when authorization fails
- Inconsistent behavior across different endpoints
- Performance bottlenecks

### 2. Redundant Plan-Based Role System

**Current Implementation:**
- **Traditional RBAC**: Roles with permissions
- **Plan-Based Templates**: System roles that get copied to organizations

```typescript
// PlanRoleService creates organization-specific roles from templates
async createOrganizationRoleFromTemplate(organizationId: string, planTier: SubscriptionTier) {
  // Creates a new role for each organization
  // Copies permissions from system template
  // Maintains separate role instances per org
}
```

**Problems:**
- Duplicate role data across organizations
- Complex synchronization when plans change
- Difficult to maintain consistency
- Over-engineered for what should be simple feature flags

### 3. Over-Complex Feature Access Logic

**Current Implementation:**
```typescript
private async checkFeatureAccess(user: CurrentUser, feature: string): Promise<void> {
  // Check 1: Organization type support
  if (!hasModuleAccess(organization.type, feature)) { /* ... */ }
  
  // Check 2: Organization allowed modules
  if (!organization.allowedModules.includes(feature)) { /* ... */ }
  
  // Check 3: Subscription plan features
  if (!this.planFeatureMapper.hasModule(subscription.plan, feature)) { /* ... */ }
  
  // Check 4: Fallback to organization features
  if (!organization.features.includes('all_features') && !organization.features.includes(feature)) { /* ... */ }
}
```

**Problems:**
- Confusing hierarchy of checks
- Unclear precedence rules
- Multiple redundant validations
- Complex error handling

### 4. Unnecessary Database Complexity

**Current Schema Issues:**
```sql
-- Role table has both metadata JSON and separate fields
metadata Json?  -- Contains planTier, isTemplate, etc.
isSystemRole Boolean
isPlatformAdmin Boolean
scope RoleScope

-- Plan role templates stored as system roles with metadata
metadata: {
  "planTier": "PRO",
  "isTemplate": true,
  "features": ["..."]
}
```

**Problems:**
- Same information stored in multiple places
- Hard to maintain consistency
- Complex queries to extract information
- Over-normalized relationships

### 5. Over-Engineered Permission Checking

**Current Implementation:**
```typescript
export async function hasPermission({ prisma, userId, resource, action, context }) {
  // 1. Query user roles with nested includes
  const userRoles = await prisma.userRole.findMany({
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  // 2. Check permission exists
  // 3. Check scope (PLATFORM/ORGANIZATION/FARM)
  // 4. Validate context matches scope
}
```

**Problems:**
- N+1 query problems
- Complex scope validation logic
- Performance issues with nested includes
- Difficult to cache results

## Recommended Simplifications

### 1. Consolidate to Single Authorization Layer

**Replace 4-layer system with single comprehensive guard:**

```typescript
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private userContextService: UserContextService,
    private planService: PlanService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Platform admins bypass all restrictions
    if (user.isPlatformAdmin) {
      return true;
    }

    // Get user context (cached)
    const userContext = await this.userContextService.getUserContext(user.userId);
    
    // Extract requirements from decorators
    const requirements = this.extractRequirements(context);
    
    // Single method that handles all authorization logic
    return this.checkAccess(userContext, requirements);
  }

  private checkAccess(userContext: UserContext, requirements: AuthorizationRequirements): boolean {
    // Check feature access
    if (requirements.feature && !userContext.hasFeature(requirements.feature)) {
      throw new ForbiddenException(`Feature '${requirements.feature}' not available`);
    }

    // Check permission
    if (requirements.permission && !userContext.hasPermission(requirements.permission)) {
      throw new ForbiddenException(`Permission '${requirements.permission}' required`);
    }

    // Check role level
    if (requirements.roleLevel && userContext.highestRoleLevel < requirements.roleLevel) {
      throw new ForbiddenException(`Role level ${requirements.roleLevel} required`);
    }

    return true;
  }
}
```

### 2. Simplify Plan-Based Access to Feature Flags

**Replace complex role template system with simple feature flags:**

```typescript
interface UserContext {
  userId: string;
  organizationId: string;
  isPlatformAdmin: boolean;
  planTier: SubscriptionTier;
  features: string[];
  modules: string[];
  permissions: string[];
  highestRoleLevel: number;
  
  hasFeature(feature: string): boolean;
  hasPermission(permission: string): boolean;
  hasModule(module: string): boolean;
}

@Injectable()
export class UserContextService {
  private userCache = new Map<string, UserContext>();
  
  async getUserContext(userId: string): Promise<UserContext> {
    if (!this.userCache.has(userId)) {
      const context = await this.buildUserContext(userId);
      this.userCache.set(userId, context);
    }
    return this.userCache.get(userId);
  }

  private async buildUserContext(userId: string): Promise<UserContext> {
    // Single query to get all user context
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { subscription: { include: { plan: true } } }
        },
        userRoles: {
          where: { isActive: true },
          include: { role: true }
        }
      }
    });

    const plan = user.organization.subscription.plan;
    const features = this.planService.getPlanFeatures(plan);
    const modules = this.planService.getPlanModules(plan);
    const permissions = this.extractUserPermissions(user.userRoles);
    const highestRoleLevel = Math.max(...user.userRoles.map(ur => ur.role.level));

    return {
      userId: user.id,
      organizationId: user.organizationId,
      isPlatformAdmin: user.isPlatformAdmin,
      planTier: plan.tier,
      features,
      modules,
      permissions,
      highestRoleLevel,
      
      hasFeature: (feature: string) => features.includes(feature) || user.isPlatformAdmin,
      hasPermission: (permission: string) => permissions.includes(permission) || user.isPlatformAdmin,
      hasModule: (module: string) => modules.includes(module) || user.isPlatformAdmin,
    };
  }
}
```

### 3. Eliminate Redundant Database Queries

**Implement caching and single-query approach:**

```typescript
@Injectable()
export class UserContextService {
  private userCache = new Map<string, UserContext>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getUserContext(userId: string): Promise<UserContext> {
    const cached = this.userCache.get(userId);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const context = await this.buildUserContext(userId);
    this.userCache.set(userId, context);
    return context;
  }

  private isCacheValid(context: UserContext): boolean {
    return Date.now() - context.cachedAt < this.CACHE_TTL;
  }

  // Invalidate cache when user permissions change
  invalidateUserCache(userId: string): void {
    this.userCache.delete(userId);
  }
}
```

### 4. Simplify Database Schema

**Remove redundant fields and consolidate metadata:**

```sql
-- Simplified role table
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization_id TEXT,
  plan_tier TEXT, -- Direct field instead of metadata
  permissions TEXT[], -- Array of permission strings
  level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified user roles table
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  farm_id TEXT, -- Optional farm-specific role
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Plan features table (instead of complex role templates)
CREATE TABLE plan_features (
  id TEXT PRIMARY KEY,
  plan_tier TEXT NOT NULL,
  feature_type TEXT NOT NULL, -- 'feature' or 'module'
  feature_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Simplified Permission System

**Replace complex permission checking with simple string matching:**

```typescript
@Injectable()
export class PermissionService {
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userContext = await this.userContextService.getUserContext(userId);
    
    // Platform admins have all permissions
    if (userContext.isPlatformAdmin) {
      return true;
    }

    // Simple string matching
    const permission = `${resource}:${action}`;
    return userContext.permissions.includes(permission);
  }

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const userContext = await this.userContextService.getUserContext(userId);
    return userContext.hasFeature(feature);
  }
}
```

## Implementation Plan

### Phase 1: Consolidate Authorization Guards (High Priority)
- [ ] Create single `AuthorizationGuard`
- [ ] Implement `UserContextService` with caching
- [ ] Update all controllers to use single guard
- [ ] Remove redundant guard classes

### Phase 2: Simplify Plan-Based Access (Medium Priority)
- [ ] Replace plan-based role templates with feature flags
- [ ] Update `PlanService` to return simple feature/module arrays
- [ ] Remove `PlanRoleService` complexity
- [ ] Update subscription change logic

### Phase 3: Optimize Database Layer (Low Priority)
- [ ] Simplify database schema
- [ ] Remove redundant metadata fields
- [ ] Implement efficient caching strategy
- [ ] Add database indexes for performance

## Detailed Cleanup Plan

### Step 1: Create New Authorization Infrastructure

#### 1.1 Create UserContextService
```bash
# Create new service
touch src/common/services/user-context.service.ts
```

**File: `src/common/services/user-context.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanService } from '../../billing/services/plan.service';

interface UserContext {
  userId: string;
  organizationId: string;
  isPlatformAdmin: boolean;
  planTier: string;
  features: string[];
  modules: string[];
  permissions: string[];
  highestRoleLevel: number;
  cachedAt: number;
  
  hasFeature(feature: string): boolean;
  hasPermission(permission: string): boolean;
  hasModule(module: string): boolean;
}

@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);
  private userCache = new Map<string, UserContext>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private planService: PlanService
  ) {}

  async getUserContext(userId: string): Promise<UserContext> {
    const cached = this.userCache.get(userId);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const context = await this.buildUserContext(userId);
    this.userCache.set(userId, context);
    return context;
  }

  private async buildUserContext(userId: string): Promise<UserContext> {
    // Implementation details...
  }

  invalidateUserCache(userId: string): void {
    this.userCache.delete(userId);
  }

  private isCacheValid(context: UserContext): boolean {
    return Date.now() - context.cachedAt < this.CACHE_TTL;
  }
}
```

#### 1.2 Create Single AuthorizationGuard
```bash
# Create new guard
touch src/common/guards/authorization.guard.ts
```

**File: `src/common/guards/authorization.guard.ts`**
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserContextService } from '../services/user-context.service';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userContextService: UserContextService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Implementation details...
  }
}
```

#### 1.3 Create Authorization Decorators
```bash
# Create new decorators
touch src/common/decorators/authorization.decorators.ts
```

**File: `src/common/decorators/authorization.decorators.ts`**
```typescript
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE = 'requireFeature';
export const REQUIRE_PERMISSION = 'requirePermission';
export const REQUIRE_ROLE_LEVEL = 'requireRoleLevel';

export const RequireFeature = (feature: string) => SetMetadata(REQUIRE_FEATURE, feature);
export const RequirePermission = (resource: string, action: string) => 
  SetMetadata(REQUIRE_PERMISSION, { resource, action });
export const RequireRoleLevel = (level: number) => SetMetadata(REQUIRE_ROLE_LEVEL, level);
```

### Step 2: Database Schema Cleanup

#### 2.1 Create Migration for Simplified Schema
```bash
# Create migration
npx prisma migrate dev --name simplify_rbac_schema
```

**Migration File: `prisma/migrations/YYYYMMDD_simplify_rbac_schema/migration.sql`**
```sql
-- Add new simplified fields
ALTER TABLE roles ADD COLUMN plan_tier TEXT;
ALTER TABLE roles ADD COLUMN permissions TEXT[];

-- Create plan_features table
CREATE TABLE plan_features (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier TEXT NOT NULL,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('feature', 'module')),
  feature_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert plan features data
INSERT INTO plan_features (plan_tier, feature_type, feature_name) VALUES
('FREE', 'feature', 'basic_farm_management'),
('FREE', 'feature', 'marketplace_access'),
('FREE', 'feature', 'order_management'),
('FREE', 'feature', 'inventory_management'),
('FREE', 'module', 'farm_management'),
('FREE', 'module', 'activities'),
('FREE', 'module', 'marketplace'),
('FREE', 'module', 'orders'),
('FREE', 'module', 'inventory'),
('FREE', 'module', 'media'),
-- Add more plan features...

-- Create indexes for performance
CREATE INDEX idx_roles_plan_tier ON roles(plan_tier);
CREATE INDEX idx_plan_features_tier ON plan_features(plan_tier);
CREATE INDEX idx_user_roles_user_active ON user_roles(user_id, is_active);
```

#### 2.2 Update Prisma Schema
**File: `prisma/schema.prisma`**
```prisma
model Role {
  id              String   @id @default(cuid())
  name            String
  description     String?
  organizationId  String?
  planTier        String?  // New simplified field
  permissions     String[] // New simplified field
  level           Int      @default(0)
  isActive        Boolean  @default(true)
  isSystemRole    Boolean  @default(false)
  isPlatformAdmin Boolean  @default(false)
  scope           RoleScope @default(ORGANIZATION)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  organization    Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userRoles       UserRole[]

  @@unique([name, organizationId])
  @@index([organizationId])
  @@index([planTier])
  @@map("roles")
}

model PlanFeature {
  id          String   @id @default(cuid())
  planTier    String
  featureType String   // 'feature' or 'module'
  featureName String
  createdAt   DateTime @default(now())

  @@index([planTier])
  @@map("plan_features")
}
```

### Step 3: Service Layer Cleanup

#### 3.1 Simplify PlanService
**File: `src/billing/services/plan.service.ts`**
```typescript
@Injectable()
export class PlanService {
  // Remove complex role template logic
  // Add simple feature/module retrieval methods
  
  async getPlanFeatures(planTier: string): Promise<string[]> {
    const features = await this.prisma.planFeature.findMany({
      where: { 
        planTier,
        featureType: 'feature'
      },
      select: { featureName: true }
    });
    return features.map(f => f.featureName);
  }

  async getPlanModules(planTier: string): Promise<string[]> {
    const modules = await this.prisma.planFeature.findMany({
      where: { 
        planTier,
        featureType: 'module'
      },
      select: { featureName: true }
    });
    return modules.map(m => m.featureName);
  }
}
```

#### 3.2 Remove PlanRoleService
```bash
# Delete complex plan role service
rm src/billing/services/plan-role.service.ts
```

#### 3.3 Update SubscriptionService
**File: `src/billing/services/subscription.service.ts`**
```typescript
// Remove plan role assignment logic
// Simplify to just update organization features
async changePlan(organizationId: string, dto: ChangePlanDto) {
  // ... existing validation ...

  const result = await this.prisma.$transaction(async (tx) => {
    // Update subscription
    const updatedSubscription = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: dto.planId,
        // ... other fields
      },
    });

    // Update organization features (simplified)
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        allowedModules: this.planService.getPlanModules(newPlan.tier),
        features: this.planService.getPlanFeatures(newPlan.tier),
      },
    });

    return updatedSubscription;
  });

  // Remove complex role update logic
  return result;
}
```

### Step 4: Controller Updates

#### 4.1 Update All Controllers
**Example: `src/rbac/rbac.controller.ts`**
```typescript
@Controller()
@UseGuards(AuthorizationGuard) // Single guard
export class RbacController {
  constructor(
    private readonly rbacService: RbacService,
  ) {}

  @TsRestHandler(rbacContract.getRoles)
  @RequirePermission('role', 'read') // Simplified decorator
  public getRoles(@Request() req: AuthenticatedRequest) {
    // Implementation...
  }

  @TsRestHandler(rbacContract.createRole)
  @RequirePermission('role', 'create')
  @RequireRoleLevel(50)
  public createRole(@Request() req: AuthenticatedRequest, @Body() body: CreateRoleDto) {
    // Implementation...
  }
}
```

#### 4.2 Remove Old Guard Imports
**Search and replace across all controller files:**
```typescript
// Remove these imports
import { FeatureAccessGuard } from '../common/guards/feature-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequireRoleLevel } from '../common/decorators/authorization.decorators';

// Replace with
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { RequirePermission, RequireRoleLevel } from '../common/decorators/authorization.decorators';
```

### Step 5: Remove Deprecated Code

#### 5.1 Delete Old Guard Files
```bash
# Remove redundant guards
rm src/common/guards/feature-access.guard.ts
rm src/common/guards/permissions.guard.ts
rm src/common/guards/organization-isolation.guard.ts
rm src/common/guards/platform-admin.guard.ts
```

#### 5.2 Clean Up Old Decorators
```bash
# Remove old decorator files
rm src/common/decorators/authorization.decorators.ts
rm src/common/decorators/secured.decorator.ts
```

#### 5.3 Update Module Imports
**File: `src/app.module.ts`**
```typescript
// Remove old guard providers
// providers: [
//   FeatureAccessGuard,
//   PermissionsGuard,
//   OrganizationIsolationGuard,
//   PlatformAdminGuard,
// ]

// Add new providers
providers: [
  AuthorizationGuard,
  UserContextService,
]
```

### Step 6: Testing and Validation

#### 6.1 Create Test Suite
```bash
# Create test files
touch src/common/services/user-context.service.spec.ts
touch src/common/guards/authorization.guard.spec.ts
```

#### 6.2 Update Existing Tests
```bash
# Update all controller tests to use new guard
find src -name "*.spec.ts" -exec sed -i 's/FeatureAccessGuard/AuthorizationGuard/g' {} \;
find src -name "*.spec.ts" -exec sed -i 's/PermissionsGuard/AuthorizationGuard/g' {} \;
```

#### 6.3 Performance Testing
```bash
# Create performance test
touch tests/authorization.performance.e2e-spec.ts
```

### Step 7: Monitoring and Rollback

#### 7.1 Add Monitoring
```typescript
// Add to UserContextService
@Injectable()
export class UserContextService {
  private readonly metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    dbQueries: 0,
  };

  async getUserContext(userId: string): Promise<UserContext> {
    const cached = this.userCache.get(userId);
    
    if (cached && this.isCacheValid(cached)) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;
    this.metrics.dbQueries++;
    // ... rest of implementation
  }
}
```

#### 7.2 Feature Flags for Rollback
```typescript
// Add feature flag support
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private userContextService: UserContextService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check feature flag
    const useNewAuth = this.configService.get('USE_NEW_AUTHORIZATION', true);
    
    if (!useNewAuth) {
      // Fall back to old authorization logic
      return this.legacyAuthorization(context);
    }

    // New authorization logic
    return this.newAuthorization(context);
  }
}
```

### Step 8: Documentation Updates

#### 8.1 Update API Documentation
```bash
# Update API docs
touch docs/authorization-guide.md
```

#### 8.2 Update README
```markdown
## Authorization

The system uses a simplified authorization model:

- **Features**: Plan-based feature access (e.g., 'analytics', 'ai_insights')
- **Permissions**: Resource-action permissions (e.g., 'farm:create', 'user:read')
- **Role Levels**: Numeric role hierarchy (0-100)

### Usage

```typescript
@Controller()
@UseGuards(AuthorizationGuard)
export class ExampleController {
  @RequireFeature('analytics')
  @RequirePermission('farm', 'read')
  @RequireRoleLevel(50)
  getFarms() {
    // Implementation
  }
}
```
```

### Cleanup Timeline

| Phase | Duration | Tasks | Risk Level |
|-------|----------|-------|------------|
| **Phase 1** | 1 week | Create new infrastructure | Low |
| **Phase 2** | 1 week | Database schema updates | Medium |
| **Phase 3** | 1 week | Service layer cleanup | Medium |
| **Phase 4** | 1 week | Controller updates | High |
| **Phase 5** | 3 days | Remove deprecated code | Low |
| **Phase 6** | 1 week | Testing and validation | Medium |
| **Phase 7** | 2 days | Monitoring setup | Low |
| **Phase 8** | 1 day | Documentation updates | Low |

**Total Estimated Duration: 6-7 weeks**

### Risk Mitigation

1. **Feature Flags**: Enable gradual rollout and quick rollback
2. **Comprehensive Testing**: Unit, integration, and performance tests
3. **Monitoring**: Real-time metrics and alerting
4. **Staged Deployment**: Deploy to staging, then production
5. **Rollback Plan**: Keep old code until new system is validated

## Expected Benefits

### Performance Improvements
- **Query Reduction**: From 4+ queries per request to 1 cached query
- **Response Time**: ~60% faster authorization checks
- **Memory Usage**: Reduced through efficient caching

### Maintainability Improvements
- **Code Complexity**: ~70% reduction in authorization code
- **Debugging**: Single point of failure instead of 4 layers
- **Testing**: Simpler unit tests with mocked user context

### Developer Experience
- **Clearer API**: Single decorator for all authorization needs
- **Better Error Messages**: Specific error messages for each failure type
- **Easier Onboarding**: New developers understand single authorization flow

## Migration Strategy

### Backward Compatibility
- Keep existing decorators during transition
- Map old decorators to new single guard
- Gradual migration of controllers

### Testing Strategy
- Comprehensive unit tests for new `UserContextService`
- Integration tests for authorization flow
- Performance tests to validate improvements

### Rollback Plan
- Feature flags to enable/disable new system
- Database migration rollback scripts
- Monitoring for authorization failures

## Conclusion

The current RBAC implementation significantly over-engineers what should be a straightforward authorization system. By consolidating to a single authorization layer, replacing complex role templates with simple feature flags, and implementing efficient caching, we can reduce complexity by ~70% while maintaining the same functionality and improving performance.

This simplification aligns with the project's preference for production-ready, simple code that avoids over-engineering and maintains ease of maintenance.
