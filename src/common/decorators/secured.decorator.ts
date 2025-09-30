import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { OrganizationIsolationGuard } from '@/common/guards/organization-isolation.guard';
import { FeatureAccessGuard } from '@/common/guards/feature-access.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequireFeature } from './authorization.decorators';

/**
 * Secured Controller Decorator
 *
 * Applies the complete security stack to a controller:
 * - JWT authentication (user must be logged in)
 * - Organization isolation (users only see their org data)
 * - Feature access control (org must have feature enabled)
 * - Permission checking (user must have required permissions)
 * - Swagger documentation (API tags and auth)
 *
 * This replaces the verbose 5-line decorator stack with a single
 * semantic decorator that clearly expresses security intent.
 *
 * @param feature - Required feature module (from FEATURES constants)
 * @param tag - Optional Swagger API tag (defaults to feature name)
 *
 * @example
 * // Before (5 decorators):
 * @ApiTags('orders')
 * @ApiBearerAuth('JWT-auth')
 * @Controller()
 * @UseGuards(JwtAuthGuard, OrganizationIsolationGuard, FeatureAccessGuard, PermissionsGuard)
 * @RequireFeature('orders')
 * export class OrdersController { }
 *
 * // After (1 decorator):
 * @Controller()
 * @Secured(FEATURES.ORDERS)
 * export class OrdersController { }
 */
export const Secured = (feature: string, tag?: string) => {
  return applyDecorators(
    ApiTags(tag || feature),
    ApiBearerAuth('JWT-auth'),
    UseGuards(
      JwtAuthGuard,
      OrganizationIsolationGuard,
      FeatureAccessGuard,
      PermissionsGuard,
    ),
    RequireFeature(feature),
  );
};