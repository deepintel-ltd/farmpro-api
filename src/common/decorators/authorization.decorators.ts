import { SetMetadata } from '@nestjs/common';
import {
  REQUIRE_PERMISSION_KEY,
  REQUIRE_ROLE_KEY,
  REQUIRE_ROLE_LEVEL_KEY,
  PermissionRequirement,
  RoleRequirement,
} from '../guards/permissions.guard';
import {
  REQUIRE_FEATURE_KEY,
  REQUIRE_CAPABILITY_KEY,
  REQUIRE_ORG_TYPE_KEY,
} from '../guards/feature-access.guard';
import { BYPASS_ORG_ISOLATION_KEY } from '../guards/organization-isolation.guard';

/**
 * Require specific permission (resource + action)
 *
 * @example
 * @RequirePermission('farms', 'read')
 * async getFarms() { ... }
 */
export const RequirePermission = (resource: string, action: string) => {
  const requirement: PermissionRequirement = { resource, action };
  return SetMetadata(REQUIRE_PERMISSION_KEY, requirement);
};

/**
 * Require specific role
 *
 * @example
 * @RequireRole('ADMIN')
 * async deleteUser() { ... }
 *
 * @example
 * // Allow platform admins to bypass
 * @RequireRole('FARM_MANAGER', { allowPlatformAdmin: true })
 * async updateFarm() { ... }
 */
export const RequireRole = (
  roleName: string,
  options?: { allowPlatformAdmin?: boolean },
) => {
  const requirement: RoleRequirement = {
    roleName,
    allowPlatformAdmin: options?.allowPlatformAdmin,
  };
  return SetMetadata(REQUIRE_ROLE_KEY, requirement);
};

/**
 * Require minimum role level
 *
 * @example
 * @RequireRoleLevel(50)  // Manager level and above
 * async approveActivity() { ... }
 */
export const RequireRoleLevel = (minimumLevel: number) =>
  SetMetadata(REQUIRE_ROLE_LEVEL_KEY, minimumLevel);

/**
 * Require specific feature/module
 *
 * @example
 * @RequireFeature('marketplace')
 * async browseMarketplace() { ... }
 */
export const RequireFeature = (feature: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);

/**
 * Require specific capability
 *
 * @example
 * @RequireCapability('create_orders')
 * async createOrder() { ... }
 */
export const RequireCapability = (capability: string) =>
  SetMetadata(REQUIRE_CAPABILITY_KEY, capability);

/**
 * Require specific organization type(s)
 *
 * @example
 * @RequireOrgType('INTEGRATED_FARM', 'FARM_OPERATION')
 * async createActivity() { ... }
 */
export const RequireOrgType = (...orgTypes: string[]) =>
  SetMetadata(REQUIRE_ORG_TYPE_KEY, orgTypes);

/**
 * Bypass organization isolation (for platform admin routes)
 *
 * @example
 * @BypassOrgIsolation()
 * async getAllOrganizations() { ... }
 */
export const BypassOrgIsolation = () =>
  SetMetadata(BYPASS_ORG_ISOLATION_KEY, true);

/**
 * Combined decorator for marketplace operations
 *
 * @example
 * @MarketplaceAccess()
 * async browseCommodities() { ... }
 */
export const MarketplaceAccess = () => {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    RequireFeature('marketplace')(target, propertyKey, descriptor);
    RequireOrgType('COMMODITY_TRADER', 'INTEGRATED_FARM', 'FARM_OPERATION')(
      target,
      propertyKey,
      descriptor,
    );
  };
};
