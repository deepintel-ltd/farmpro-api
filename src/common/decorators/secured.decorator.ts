import { applyDecorators } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireFeature } from './authorization.decorators';

/**
 * Secured Controller Decorator
 *
 * Applies the simplified security stack to a controller:
 * - JWT authentication (handled by global AuthorizationGuard)
 * - Feature access control (org must have feature enabled)
 * - Swagger documentation (API tags and auth)
 *
 * @param feature - Required feature module (from FEATURES constants)
 * @param tag - Optional Swagger API tag (defaults to feature name)
 *
 * @example
 * @Controller()
 * @Secured(FEATURES.ORDERS)
 * export class OrdersController { }
 */
export const Secured = (feature: string, tag?: string) => {
  return applyDecorators(
    ApiTags(tag || feature),
    ApiBearerAuth('JWT-auth'),
    RequireFeature(feature),
  );
};