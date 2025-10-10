# RBAC Simplification - Quick Reference Card

**For Developers** | **Last Updated**: 2025-10-10

---

## 🎯 New Authorization System - Cheat Sheet

### Before (Complex - Delete This)
```typescript
// OLD - DON'T USE
@UseGuards(PermissionsGuard)
@RequirePermission({ resource: 'farms', action: 'read' })
async getFarms() { ... }

// OLD - DON'T USE
@UseGuards(FeatureAccessGuard)
@RequireFeature(FEATURES.ANALYTICS)
async getAnalytics() { ... }
```

### After (Simple - Use This)
```typescript
// NEW - Simple permission check
@RequirePermission('farms', 'read')
async getFarms() { ... }

// NEW - Simple feature check
@RequireFeature('advanced_analytics')
async getAnalytics() { ... }

// NEW - Module check
@RequireModule('intelligence')
async useAI() { ... }
```

---

## 📋 How to Protect an Endpoint

### 1. Permission-Based (Most Common)
```typescript
import { RequirePermission } from '@/common/decorators/authorization.decorators';

@Controller('farms')
export class FarmsController {
  @Get()
  @RequirePermission('farms', 'read')
  async findAll() {
    // Only users whose plan includes 'farms:read'
  }

  @Post()
  @RequirePermission('farms', 'create')
  async create() {
    // Only users whose plan includes 'farms:create'
  }

  @Delete(':id')
  @RequirePermission('farms', 'delete')
  async delete() {
    // Only users whose plan includes 'farms:delete'
  }
}
```

### 2. Feature-Based (For Premium Features)
```typescript
import { RequireFeature } from '@/common/decorators/authorization.decorators';

@Controller('analytics')
export class AnalyticsController {
  @Get('basic')
  @RequirePermission('analytics', 'read')
  async getBasicAnalytics() {
    // All BASIC+ plans
  }

  @Get('advanced')
  @RequireFeature('advanced_analytics')
  async getAdvancedAnalytics() {
    // Only PRO+ plans with advanced_analytics feature
  }
}
```

### 3. Module-Based (For Entire Modules)
```typescript
import { RequireModule } from '@/common/decorators/authorization.decorators';

@Controller('intelligence')
@RequireModule('intelligence')
export class IntelligenceController {
  // All endpoints require 'intelligence' module
  // Available in PRO+ plans

  @Post('analyze')
  async analyze() { ... }

  @Post('predict')
  async predict() { ... }
}
```

---

## 🔑 Permission Naming Convention

**Format**: `resource:action`

**Resources**: `farms`, `activities`, `inventory`, `marketplace`, `orders`, `analytics`, `intelligence`, `rbac`, `users`, `organizations`

**Actions**: `read`, `create`, `update`, `delete`, `*` (all)

**Examples**:
- `farms:read` - Can view farms
- `farms:create` - Can create farms
- `farms:*` - Can do anything with farms
- `*:*` - Full access (ENTERPRISE only)

---

## 📊 Plan Tier Permissions Matrix

| Permission | FREE | BASIC | PRO | ENTERPRISE |
|------------|------|-------|-----|------------|
| `farms:read` | ✅ | ✅ | ✅ | ✅ |
| `farms:create` | ✅ (1 max) | ✅ (2 max) | ✅ (5 max) | ✅ |
| `activities:update` | ❌ | ✅ | ✅ | ✅ |
| `analytics:read` | ❌ | ✅ | ✅ | ✅ |
| `analytics:export` | ❌ | ❌ | ✅ | ✅ |
| `intelligence:use` | ❌ | ❌ | ✅ | ✅ |
| `rbac:manage` | ❌ | ❌ | ❌ | ✅ |

Full list: See `src/common/constants/plan-permissions.constant.ts`

---

## 🧪 Testing with New System

### Unit Tests
```typescript
import { createTestUserContext } from '@/test-utils/test-context';

describe('FarmsController', () => {
  it('should allow PRO users to read farms', async () => {
    const userContext = createTestUserContext({
      planTier: 'PRO',
      permissions: new Set(['farms:read', 'farms:create']),
    });

    // Mock the service to return userContext
    // Test your endpoint
  });

  it('should deny FREE users from analytics', async () => {
    const userContext = createTestUserContext({
      planTier: 'FREE',
      permissions: new Set(['farms:read']),
    });

    // Should throw ForbiddenException
  });
});
```

### E2E Tests
```typescript
describe('Authorization (e2e)', () => {
  it('should enforce plan-based permissions', async () => {
    const freeUser = await createTestUser('FREE');

    // Should succeed
    await request(app.getHttpServer())
      .get('/farms')
      .set('Authorization', `Bearer ${freeUser.token}`)
      .expect(200);

    // Should fail
    await request(app.getHttpServer())
      .get('/analytics/advanced')
      .set('Authorization', `Bearer ${freeUser.token}`)
      .expect(403);
  });
});
```

---

## 🚀 Accessing User Context in Controllers

```typescript
import { UserContext } from '@/common/services/user-context.service';

@Controller('farms')
export class FarmsController {
  @Get()
  @RequirePermission('farms', 'read')
  async findAll(@Request() req) {
    const userContext: UserContext = req.userContext;

    // Use context directly
    const planTier = userContext.planTier;
    const orgId = userContext.organizationId;

    // Check additional permissions dynamically
    if (userContext.can('analytics', 'export')) {
      // User can export
    }

    if (userContext.hasFeature('advanced_analytics')) {
      // User has premium feature
    }
  }
}
```

---

## 🔧 Common Patterns

### 1. Multi-Tier Feature
```typescript
@Get('analytics')
async getAnalytics(@Request() req) {
  const userContext: UserContext = req.userContext;

  // Base analytics for BASIC+
  const baseData = await this.getBaseAnalytics();

  // Advanced analytics for PRO+
  if (userContext.hasFeature('advanced_analytics')) {
    const advancedData = await this.getAdvancedAnalytics();
    return { ...baseData, ...advancedData };
  }

  return baseData;
}
```

### 2. Platform Admin Bypass
```typescript
@Delete('organizations/:id')
@RequirePermission('organizations', 'delete')
async deleteOrganization(
  @Param('id') id: string,
  @Request() req,
) {
  const userContext: UserContext = req.userContext;

  // Platform admins can delete any organization
  if (!userContext.isPlatformAdmin) {
    // Regular users can only delete their own
    if (id !== userContext.organizationId) {
      throw new ForbiddenException();
    }
  }

  return this.organizationsService.delete(id);
}
```

### 3. Plan-Based Limits
```typescript
@Post('farms')
@RequirePermission('farms', 'create')
async createFarm(@Body() dto: CreateFarmDto, @Request() req) {
  const userContext: UserContext = req.userContext;

  // Check plan limits
  const currentFarms = await this.farmsService.count(
    userContext.organizationId,
  );

  const limits = {
    FREE: 1,
    BASIC: 2,
    PRO: 5,
    ENTERPRISE: Infinity,
  };

  if (currentFarms >= limits[userContext.planTier]) {
    throw new ForbiddenException(
      `Your plan allows maximum ${limits[userContext.planTier]} farms. Please upgrade to create more.`,
    );
  }

  return this.farmsService.create(dto);
}
```

---

## ⚡ Cache Behavior

**Cache TTL**: 5 minutes per user

**Cache Invalidation**:
- **Automatic**: When organization plan changes
- **Manual**: Call `userContextService.invalidateCache(userId)`

**Example**: Invalidating after plan change
```typescript
async changePlan(orgId: string, newPlanId: string) {
  await this.prisma.subscription.update({
    where: { organizationId: orgId },
    data: { planId: newPlanId },
  });

  // Invalidate cache for all users in organization
  this.userContextService.invalidateOrganizationCache(orgId);
}
```

---

## 🐛 Debugging Tips

### Check User's Permissions
```typescript
const userContext = await userContextService.getUserContext(userId);
console.log('Plan Tier:', userContext.planTier);
console.log('Permissions:', Array.from(userContext.permissions));
console.log('Features:', Array.from(userContext.features));
console.log('Can create farms?', userContext.can('farms', 'create'));
```

### Check Cache Stats
```typescript
const stats = userContextService.getCacheStats();
console.log('Cache size:', stats.size);
console.log('Cache TTL:', stats.ttl);
```

### Common Errors

**"Your plan does not include permission to..."**
- User's plan tier doesn't have the required permission
- Check `PLAN_PERMISSIONS` constant for correct tier

**"Your plan does not include the 'X' feature"**
- Feature not enabled for user's plan
- Check `SubscriptionPlan.hasXXX` flags

**"Authentication required"**
- No JWT token in request
- Check `@Public()` decorator if route should be public

---

## 📞 Need Help?

**Permission not working?**
1. Check `src/common/constants/plan-permissions.constant.ts`
2. Verify user's plan tier in database
3. Clear cache: `userContextService.invalidateCache(userId)`

**Implementation questions?**
- See full guide: [RBAC_CLEAN_IMPLEMENTATION.md](./RBAC_CLEAN_IMPLEMENTATION.md)

**Understanding the why?**
- See analysis: [RBAC_OVER_ENGINEERING_ANALYSIS.md](./RBAC_OVER_ENGINEERING_ANALYSIS.md)

---

**Quick Wins**:
- ✅ No more complex guard chains
- ✅ No more role synchronization
- ✅ Instant plan changes
- ✅ <2ms auth latency
- ✅ Simple, predictable behavior
