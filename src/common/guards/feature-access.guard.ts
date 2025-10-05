import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';
import {
  hasModuleAccess,
} from '@/common/config/organization-features.config';
import { PlanFeatureMapperService } from '@/billing/services/plan-feature-mapper.service';
import { SubscriptionService } from '@/billing/services/subscription.service';

// Metadata keys for feature requirements
export const REQUIRE_FEATURE_KEY = 'requireFeature';
export const REQUIRE_CAPABILITY_KEY = 'requireCapability';
export const REQUIRE_ORG_TYPE_KEY = 'requireOrgType';

/**
 * Feature Access Guard
 *
 * Controls access to features based on:
 * 1. Organization type (what features are available to this type)
 * 2. Organization plan (what features are enabled in their subscription)
 * 3. Organization-specific feature flags
 *
 * Platform admins bypass these restrictions.
 */
@Injectable()
export class FeatureAccessGuard implements CanActivate {
  private readonly logger = new Logger(FeatureAccessGuard.name);

  constructor(
    private reflector: Reflector,
    private planFeatureMapper: PlanFeatureMapperService,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Platform admins bypass all feature restrictions
    if (user.isPlatformAdmin) {
      this.logger.debug('Platform admin bypassing feature restrictions');
      return true;
    }

    // Check required feature/module
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredFeature) {
      await this.checkFeatureAccess(user, requiredFeature);
    }

    // Check required capability
    const requiredCapability = this.reflector.getAllAndOverride<string>(
      REQUIRE_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredCapability) {
      this.checkCapabilityAccess(user, requiredCapability);
    }

    // Check organization type requirement
    const requiredOrgTypes = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ORG_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredOrgTypes && requiredOrgTypes.length > 0) {
      this.checkOrgTypeAccess(user, requiredOrgTypes);
    }

    return true;
  }

  private async checkFeatureAccess(user: CurrentUser, feature: string): Promise<void> {
    const { organization } = user;

    // Special case: RBAC is available to all organizations
    if (feature === 'rbac') {
      this.logger.debug(
        `User ${user.email} granted access to RBAC feature (available to all organizations)`,
      );
      return;
    }

    // Check if org type supports this feature
    if (!hasModuleAccess(organization.type, feature)) {
      this.logger.warn(
        `User ${user.email} attempted to access feature '${feature}' not available for org type ${organization.type}`,
      );
      throw new ForbiddenException(
        `Feature '${feature}' is not available for ${organization.type} organizations`,
      );
    }

    // Check if feature is in allowed modules
    if (!organization.allowedModules.includes(feature)) {
      this.logger.warn(
        `User ${user.email} attempted to access feature '${feature}' not in allowed modules`,
      );
      throw new ForbiddenException(
        `Feature '${feature}' is not enabled for your organization`,
      );
    }

    // Check subscription plan features
    try {
      const subscription = await this.subscriptionService['getCurrentSubscriptionInternal'](
        user.organizationId,
      );
      
      if (!this.planFeatureMapper.hasModule(subscription.plan, feature)) {
        this.logger.warn(
          `User ${user.email} attempted to access feature '${feature}' not in subscription plan`,
        );
        throw new ForbiddenException(
          `Feature '${feature}' is not included in your current plan. Please upgrade to access this feature.`,
        );
      }
    } catch (error) {
      // If no subscription found, fall back to organization features
      this.logger.warn(`No subscription found for organization ${user.organizationId}, using organization features`);
      
      if (!organization.features.includes('all_features') && !organization.features.includes(feature)) {
        this.logger.warn(
          `User ${user.email} attempted to access feature '${feature}' not in plan`,
        );
        throw new ForbiddenException(
          `Feature '${feature}' is not included in your current plan. Please upgrade to access this feature.`,
        );
      }
    }

    this.logger.debug(
      `User ${user.email} granted access to feature '${feature}'`,
    );
  }

  private checkCapabilityAccess(user: CurrentUser, capability: string): void {
    if (!user.capabilities.includes(capability)) {
      this.logger.warn(
        `User ${user.email} attempted to use capability '${capability}' not available to them`,
      );
      throw new ForbiddenException(
        `Your organization does not have the '${capability}' capability`,
      );
    }

    this.logger.debug(
      `User ${user.email} granted capability '${capability}'`,
    );
  }

  private checkOrgTypeAccess(
    user: CurrentUser,
    allowedTypes: string[],
  ): void {
    if (!allowedTypes.includes(user.organization.type)) {
      this.logger.warn(
        `User ${user.email} with org type ${user.organization.type} attempted to access resource restricted to ${allowedTypes.join(', ')}`,
      );
      throw new ForbiddenException(
        `This resource is only available to ${allowedTypes.join(', ')} organizations`,
      );
    }

    this.logger.debug(
      `User ${user.email} org type ${user.organization.type} matches required types`,
    );
  }
}
