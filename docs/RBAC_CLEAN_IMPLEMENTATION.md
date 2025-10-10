# RBAC Simplification - Clean Implementation Guide

**Date**: 2025-10-10
**Approach**: Clean rebuild - No feature flags, no backward compatibility
**Timeline**: 3-4 weeks
**Status**: Ready to start

---

## 🎯 Implementation Philosophy

**Clean Foundation Approach**:
- ❌ No feature flags
- ❌ No gradual migration
- ❌ No backward compatibility
- ✅ Build it right the first time
- ✅ Clean, optimal solution
- ✅ Proper foundation for future growth

---

## 📋 Complete Implementation Checklist

### Week 1: Foundation & Core Components

#### Day 1-2: Permission Matrix & Constants
- [ ] Define `PLAN_PERMISSIONS` constant
  - [ ] Map all existing permissions to plan tiers
  - [ ] Get product approval on permission matrix
  - [ ] Document permission rationale
- [ ] Create `src/common/constants/plan-permissions.constant.ts`
- [ ] Update existing `permissions.constants.ts` to work with new system

#### Day 3-4: UserContextService
- [ ] Create `src/common/services/user-context.service.ts`
  - [ ] Implement caching (5-min TTL)
  - [ ] Build context from single DB query
  - [ ] Add cache invalidation methods
  - [ ] Extract features/modules from plan
- [ ] Unit tests for UserContextService (>90% coverage)

#### Day 5: AuthorizationGuard & Decorators
- [ ] Create `src/common/guards/authorization.guard.ts`
  - [ ] Implement unified permission/feature/module checking
  - [ ] Integrate with UserContextService
  - [ ] Handle platform admin bypass
- [ ] Create `src/common/decorators/authorization.decorators.ts`
  - [ ] `@RequirePermission(resource, action)`
  - [ ] `@RequireFeature(feature)`
  - [ ] `@RequireModule(module)`
- [ ] Unit tests for guard and decorators

---

### Week 2: Database Migration & Service Updates

#### Day 1: Database Backup & Migration
- [ ] Full database backup
- [ ] Create migration:
  ```bash
  npx prisma migrate dev --name simplify_rbac_system
  ```
- [ ] Migration drops:
  - [ ] `role_permissions` table
  - [ ] Org-specific plan-based roles
  - [ ] User role assignments for plan-based roles
- [ ] Run migration in local environment
- [ ] Verify migration with test data

#### Day 2-3: Auth Service Updates
- [ ] Update `src/auth/auth.service.ts`:
  - [ ] Remove all `planRoleService` imports
  - [ ] Update `register()` - remove role assignment
  - [ ] Update `generateTokens()` - include plan tier in JWT
  - [ ] Update `completeProfile()` - remove role logic
  - [ ] Update OAuth callbacks - remove role logic
- [ ] Update tests for AuthService

#### Day 4-5: Subscription Service Updates
- [ ] Update `src/billing/services/subscription.service.ts`:
  - [ ] Remove `planRoleService` dependency
  - [ ] Update `changePlan()` - add cache invalidation only
  - [ ] Update `cancelSubscription()` - add cache invalidation
  - [ ] Update `reactivateSubscription()` - add cache invalidation
- [ ] Update tests for SubscriptionService

---

### Week 3: Controller & Module Updates

#### Day 1-2: Global Guard Replacement
- [ ] Update `src/main.ts`:
  - [ ] Remove old guards from global registration
  - [ ] Add `AuthorizationGuard` globally
  - [ ] Update app configuration
- [ ] Update `src/common/common.module.ts`:
  - [ ] Export `UserContextService`
  - [ ] Export `AuthorizationGuard`
  - [ ] Remove old guard exports

#### Day 3-4: Controller Decorator Updates
Batch update all controllers (use find/replace):

**Find**: `@UseGuards(PermissionsGuard)` + `@RequirePermission({ resource: 'X', action: 'Y' })`
**Replace**: `@RequirePermission('X', 'Y')`

**Find**: `@UseGuards(FeatureAccessGuard)` + `@RequireFeature(FEATURES.X)`
**Replace**: `@RequireFeature('X')`

Files to update (~22 controllers):
- [ ] `src/farms/farms.controller.ts`
- [ ] `src/activities/activities.controller.ts`
- [ ] `src/inventory/inventory.controller.ts`
- [ ] `src/marketplace/*.controller.ts`
- [ ] `src/orders/orders.controller.ts`
- [ ] `src/analytics/analytics.controller.ts`
- [ ] `src/intelligence/intelligence.controller.ts`
- [ ] `src/organizations/organizations.controller.ts`
- [ ] `src/users/users.controller.ts`
- [ ] `src/rbac/rbac.controller.ts`
- [ ] `src/billing/billing.controller.ts`
- [ ] `src/media/media.controller.ts`
- [ ] `src/weather/weather.controller.ts`
- [ ] `src/market/market.controller.ts`
- [ ] `src/transactions/transactions.controller.ts`
- [ ] `src/executive-dashboard/executive-dashboard.controller.ts`
- [ ] `src/platform-admin/platform-admin.controller.ts`
- [ ] All remaining controllers

#### Day 5: Delete Old Files
```bash
# Services
rm src/billing/services/plan-role.service.ts
rm src/billing/services/plan-role.service.spec.ts

# Guards
rm src/common/guards/permissions.guard.ts
rm src/common/guards/permissions.guard.spec.ts
rm src/common/guards/feature-access.guard.ts
rm src/common/guards/feature-access.guard.spec.ts
rm src/common/guards/organization-isolation.guard.ts
rm src/common/guards/organization-isolation.guard.spec.ts

# Utilities
rm src/common/utils/permission.utils.ts

# Update module imports
- Remove from src/billing/billing.module.ts
- Remove from src/common/common.module.ts
```

---

### Week 4: Testing & Deployment

#### Day 1-2: Test Updates
- [ ] Update `src/test-utils/test-context.ts`:
  - [ ] Add `createTestUserContext()` helper
  - [ ] Simplify test setup
- [ ] Update unit tests:
  - [ ] Replace role mocking with UserContext mocking
  - [ ] Simplify test scenarios
  - [ ] Ensure >90% coverage
- [ ] Update E2E tests:
  - [ ] `tests/authorization.e2e-spec.ts` - rewrite for new system
  - [ ] `tests/authorization.integration.e2e-spec.ts` - update
  - [ ] `tests/rbac.e2e-spec.ts` - update or remove
  - [ ] All feature-specific E2E tests

#### Day 3: Security Audit & Performance Testing
- [ ] Security audit checklist:
  - [ ] FREE users cannot access PRO features ✓
  - [ ] Plan downgrades restrict access immediately ✓
  - [ ] Platform admins have full access ✓
  - [ ] Cache invalidation works correctly ✓
  - [ ] No permission bypasses ✓
- [ ] Performance testing:
  - [ ] Load test with 1000+ concurrent users
  - [ ] Verify auth latency <2ms
  - [ ] Verify cache hit rate >95%
  - [ ] Monitor memory usage

#### Day 4: Staging Deployment
- [ ] Deploy to staging:
  ```bash
  # Backup staging DB
  pg_dump farmpro_staging > backup_staging_rbac.sql

  # Deploy code
  git checkout main
  git pull
  npm ci
  npm run build

  # Run migration
  npm run prisma:migrate:deploy

  # Restart app
  pm2 restart farmpro-api-staging
  ```
- [ ] Run full E2E test suite in staging
- [ ] Manual testing of critical flows
- [ ] Monitor for 24 hours

#### Day 5: Production Deployment
- [ ] Production deployment:
  ```bash
  # Full backup
  pg_dump farmpro_production > backup_prod_rbac_$(date +%Y%m%d).sql

  # Deploy (coordinated with team)
  git checkout main
  git tag v2.0.0-rbac-simplified
  npm ci
  npm run build
  npm run prisma:migrate:deploy
  pm2 restart farmpro-api
  ```
- [ ] Post-deployment monitoring:
  - [ ] Error rates (should not increase)
  - [ ] Auth latency (should drop to <2ms)
  - [ ] Cache metrics (>95% hit rate)
  - [ ] User feedback
- [ ] Monitor for 48 hours before declaring success

---

## 📝 Detailed Implementation Code

### 1. Plan Permissions Constant

```typescript
// src/common/constants/plan-permissions.constant.ts
import { SubscriptionTier } from '@prisma/client';

export const PLAN_PERMISSIONS: Record<SubscriptionTier, string[]> = {
  FREE: [
    // Farm Management (limited)
    'farms:read',
    'farms:create', // Max 1 farm enforced by feature limit

    // Activities (basic)
    'activities:read',
    'activities:create',

    // Inventory (read-only)
    'inventory:read',

    // Marketplace (browse only)
    'marketplace:browse',

    // Media (limited)
    'media:read',
    'media:create', // Limited by storage quota
  ],

  BASIC: [
    // Farm Management (expanded)
    'farms:read',
    'farms:create', // Max 2 farms
    'farms:update',

    // Activities (full CRUD)
    'activities:read',
    'activities:create',
    'activities:update',
    'activities:delete',

    // Inventory (full CRUD)
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'inventory:delete',

    // Marketplace (read + browse)
    'marketplace:browse',
    'marketplace:read',

    // Orders (create only)
    'orders:read',
    'orders:create',

    // Analytics (basic)
    'analytics:read',

    // Media
    'media:read',
    'media:create',
    'media:update',
    'media:delete',
  ],

  PRO: [
    // All BASIC permissions plus:
    'farms:*', // Up to 5 farms
    'activities:*',
    'activities:assign',
    'activities:bulk_schedule',
    'inventory:*',
    'marketplace:*',
    'marketplace:create_listing',
    'marketplace:generate_contract',
    'orders:*',
    'analytics:*',
    'analytics:export',
    'intelligence:read',
    'intelligence:create',
    'api:access',
    'media:*',
    'users:read',
    'users:update',
    'organizations:read',
    'organizations:update',
  ],

  ENTERPRISE: [
    // Full access to everything
    '*:*',

    // Additional enterprise-only permissions
    'rbac:read',
    'rbac:create',
    'rbac:update',
    'rbac:delete',
    'organizations:export',
    'organizations:backup',
    'organizations:delete',
  ],
};

/**
 * Check if a permission matches a permission pattern
 * Supports wildcards: 'farms:*', '*:read', '*:*'
 */
export function matchesPermission(
  required: string,
  granted: string,
): boolean {
  if (granted === '*:*') return true;

  const [requiredResource, requiredAction] = required.split(':');
  const [grantedResource, grantedAction] = granted.split(':');

  if (grantedResource === '*') return true;
  if (requiredResource !== grantedResource) return false;

  if (grantedAction === '*') return true;
  return requiredAction === grantedAction;
}

/**
 * Get all permissions for a plan tier
 */
export function getPlanPermissions(tier: SubscriptionTier): string[] {
  return PLAN_PERMISSIONS[tier] || PLAN_PERMISSIONS.FREE;
}

/**
 * Check if a plan tier has a specific permission
 */
export function planHasPermission(
  tier: SubscriptionTier,
  resource: string,
  action: string,
): boolean {
  const permissions = getPlanPermissions(tier);
  const required = `${resource}:${action}`;

  return permissions.some(granted => matchesPermission(required, granted));
}
```

---

### 2. UserContextService

```typescript
// src/common/services/user-context.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';
import {
  getPlanPermissions,
  matchesPermission,
} from '@/common/constants/plan-permissions.constant';

export interface UserContext {
  userId: string;
  email: string;
  organizationId: string;
  planTier: SubscriptionTier;
  isPlatformAdmin: boolean;
  permissions: Set<string>;
  features: Set<string>;
  modules: Set<string>;

  // Helper methods
  can(resource: string, action: string): boolean;
  hasFeature(feature: string): boolean;
  hasModule(module: string): boolean;
}

interface CachedContext {
  context: UserContext;
  expiresAt: number;
}

@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);
  private cache = new Map<string, CachedContext>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {
    // Clear expired cache entries every minute
    setInterval(() => this.clearExpiredCache(), 60 * 1000);
  }

  /**
   * Get user context (cached for 5 minutes)
   */
  async getUserContext(userId: string): Promise<UserContext> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug(`Cache hit for user ${userId}`);
      return cached.context;
    }

    // Build context from database
    this.logger.debug(`Cache miss for user ${userId}, building context`);
    const context = await this.buildUserContext(userId);

    // Cache it
    this.cache.set(userId, {
      context,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return context;
  }

  /**
   * Build user context from database (single query)
   */
  private async buildUserContext(userId: string): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
        userRoles: {
          where: { isActive: true },
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.organizationId) {
      throw new Error(`User ${userId} has no organization`);
    }

    const planTier =
      (user.organization?.subscription?.plan?.tier as SubscriptionTier) || 'FREE';
    const isPlatformAdmin = user.userRoles.some(
      ur => ur.role.isPlatformAdmin,
    );

    // Get permissions from plan tier
    const planPermissions = getPlanPermissions(planTier);
    const permissions = new Set(planPermissions);

    // Get features and modules from plan
    const plan = user.organization?.subscription?.plan;
    const features = this.extractFeatures(plan);
    const modules = this.extractModules(planTier);

    const context: UserContext = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      planTier,
      isPlatformAdmin,
      permissions,
      features,
      modules,

      can: (resource: string, action: string) => {
        if (isPlatformAdmin) return true;

        const required = `${resource}:${action}`;
        return Array.from(permissions).some(granted =>
          matchesPermission(required, granted),
        );
      },

      hasFeature: (feature: string) => {
        if (isPlatformAdmin) return true;
        return features.has(feature);
      },

      hasModule: (module: string) => {
        if (isPlatformAdmin) return true;
        return modules.has(module);
      },
    };

    return context;
  }

  /**
   * Invalidate cache for a specific user
   */
  invalidateCache(userId: string): void {
    this.cache.delete(userId);
    this.logger.debug(`Invalidated cache for user ${userId}`);
  }

  /**
   * Invalidate cache for all users in an organization
   * Called when organization plan changes
   */
  invalidateOrganizationCache(organizationId: string): void {
    let count = 0;
    for (const [userId, cached] of this.cache.entries()) {
      if (cached.context.organizationId === organizationId) {
        this.cache.delete(userId);
        count++;
      }
    }
    this.logger.log(
      `Invalidated cache for ${count} users in organization ${organizationId}`,
    );
  }

  /**
   * Clear all expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [userId, cached] of this.cache.entries()) {
      if (now >= cached.expiresAt) {
        this.cache.delete(userId);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      ttl: this.CACHE_TTL,
    };
  }

  /**
   * Extract features from subscription plan
   */
  private extractFeatures(plan: any): Set<string> {
    const features = new Set<string>();
    if (!plan) return features;

    if (plan.hasAdvancedAnalytics) features.add('advanced_analytics');
    if (plan.hasAIInsights) features.add('ai_insights');
    if (plan.hasAPIAccess) features.add('api_access');
    if (plan.hasCustomRoles) features.add('custom_roles');
    if (plan.hasPrioritySupport) features.add('priority_support');
    if (plan.hasWhiteLabel) features.add('white_label');

    return features;
  }

  /**
   * Extract modules from plan tier
   */
  private extractModules(tier: SubscriptionTier): Set<string> {
    const moduleMap: Record<SubscriptionTier, string[]> = {
      FREE: ['farm_management', 'activities', 'marketplace', 'inventory'],
      BASIC: [
        'farm_management',
        'activities',
        'marketplace',
        'inventory',
        'orders',
        'analytics',
      ],
      PRO: [
        'farm_management',
        'activities',
        'marketplace',
        'inventory',
        'orders',
        'analytics',
        'intelligence',
        'api',
      ],
      ENTERPRISE: [
        'farm_management',
        'activities',
        'marketplace',
        'inventory',
        'orders',
        'analytics',
        'intelligence',
        'api',
        'rbac',
        'advanced_analytics',
      ],
    };

    return new Set(moduleMap[tier] || moduleMap.FREE);
  }
}
```

---

### 3. AuthorizationGuard

```typescript
// src/common/guards/authorization.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserContextService } from '@/common/services/user-context.service';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(
    private reflector: Reflector,
    private userContextService: UserContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user context (cached)
    const userContext = await this.userContextService.getUserContext(
      user.userId,
    );

    // Platform admins bypass all checks
    if (userContext.isPlatformAdmin) {
      this.logger.debug(`Platform admin ${user.email} bypassing auth checks`);
      request.userContext = userContext;
      return true;
    }

    // Check permission requirement
    const requiredPermission = this.reflector.get<{
      resource: string;
      action: string;
    }>('permission', context.getHandler());

    if (requiredPermission) {
      const { resource, action } = requiredPermission;
      if (!userContext.can(resource, action)) {
        this.logger.warn(
          `User ${user.email} denied ${resource}:${action} (plan: ${userContext.planTier})`,
        );
        throw new ForbiddenException(
          `Your plan (${userContext.planTier}) does not include permission to ${action} ${resource}`,
        );
      }
    }

    // Check feature requirement
    const requiredFeature = this.reflector.get<string>(
      'feature',
      context.getHandler(),
    );

    if (requiredFeature && !userContext.hasFeature(requiredFeature)) {
      this.logger.warn(
        `User ${user.email} denied feature '${requiredFeature}' (plan: ${userContext.planTier})`,
      );
      throw new ForbiddenException(
        `Your plan does not include the '${requiredFeature}' feature. Please upgrade to access this functionality.`,
      );
    }

    // Check module requirement
    const requiredModule = this.reflector.get<string>(
      'module',
      context.getHandler(),
    );

    if (requiredModule && !userContext.hasModule(requiredModule)) {
      this.logger.warn(
        `User ${user.email} denied module '${requiredModule}' (plan: ${userContext.planTier})`,
      );
      throw new ForbiddenException(
        `Your plan does not include the '${requiredModule}' module`,
      );
    }

    // Attach context to request for controllers to use
    request.userContext = userContext;

    return true;
  }
}
```

---

### 4. Decorators

```typescript
// src/common/decorators/authorization.decorators.ts
import { SetMetadata } from '@nestjs/common';

/**
 * Require a specific permission to access the route
 * @param resource - The resource name (e.g., 'farms', 'activities')
 * @param action - The action (e.g., 'read', 'create', 'update', 'delete')
 *
 * @example
 * @RequirePermission('farms', 'read')
 * async getFarms() { ... }
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata('permission', { resource, action });

/**
 * Require a specific feature to access the route
 * @param feature - The feature name (e.g., 'advanced_analytics', 'ai_insights')
 *
 * @example
 * @RequireFeature('advanced_analytics')
 * async getAdvancedAnalytics() { ... }
 */
export const RequireFeature = (feature: string) =>
  SetMetadata('feature', feature);

/**
 * Require a specific module to access the route
 * @param module - The module name (e.g., 'intelligence', 'api')
 *
 * @example
 * @RequireModule('intelligence')
 * async useIntelligence() { ... }
 */
export const RequireModule = (module: string) =>
  SetMetadata('module', module);
```

---

### 5. Database Migration

```sql
-- prisma/migrations/YYYYMMDDHHMMSS_simplify_rbac_system/migration.sql

-- Step 1: Remove user role assignments for plan-based roles
DELETE FROM "user_roles"
WHERE "roleId" IN (
  SELECT id FROM "roles"
  WHERE "organizationId" IS NOT NULL
    AND "metadata" IS NOT NULL
    AND ("metadata"->>'isPlanRole')::boolean = true
);

-- Step 2: Remove org-specific plan-based role records
DELETE FROM "roles"
WHERE "organizationId" IS NOT NULL
  AND "metadata" IS NOT NULL
  AND ("metadata"->>'isPlanRole')::boolean = true;

-- Step 3: Drop the role_permissions table (no longer needed)
DROP TABLE IF EXISTS "role_permissions" CASCADE;

-- Step 4: Optional - Clean up Permission table if not used for platform admins
-- Uncomment if you don't need Permission table at all
-- DROP TABLE IF EXISTS "permissions" CASCADE;

-- Step 5: Update Role model (remove unused columns - do this in schema.prisma instead)
-- This is handled by schema changes, not SQL migration
```

---

## 🚀 Quick Start Commands

```bash
# Week 1: Setup
npm run prisma:generate
npm run test

# Week 2: Migration
npm run prisma:migrate:dev --name simplify_rbac_system

# Week 3: Testing
npm run test:unit
npm run test:e2e

# Week 4: Deployment
npm run build
npm run prisma:migrate:deploy
pm2 restart farmpro-api
```

---

## 📈 Success Metrics

Track these metrics during and after implementation:

- **Code Reduction**: 1,446 → ~250 lines (-83%)
- **Auth Latency**: 50-100ms → <2ms (-98%)
- **DB Queries**: 4-6 → 1 cached (-83%)
- **Cache Hit Rate**: >95%
- **Error Rate**: No increase
- **Plan Changes**: Instant (vs 5-10s)

---

**Ready to Start**: ✅
**Next Step**: Begin Week 1, Day 1 - Define permission matrix
