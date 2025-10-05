import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { FeatureAccessGuard } from './feature-access.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';

// Mock the organization features config
jest.mock('@/common/config/organization-features.config', () => ({
  ORGANIZATION_FEATURES: {
    FARM_OPERATION: ['farm_management', 'inventory', 'analytics'],
    COMMODITY_TRADER: ['marketplace', 'orders', 'analytics'],
    INTEGRATED_FARM: ['farm_management', 'marketplace', 'inventory', 'orders', 'analytics'],
    PLATFORM: ['all'],
  },
  hasModuleAccess: jest.fn((orgType: string, feature: string) => {
    const features = {
      FARM_OPERATION: ['farm_management', 'inventory', 'analytics'],
      COMMODITY_TRADER: ['marketplace', 'orders', 'analytics'],
      INTEGRATED_FARM: ['farm_management', 'marketplace', 'inventory', 'orders', 'analytics'],
      PLATFORM: ['all'],
    };
    return features[orgType]?.includes(feature) || false;
  }),
}));

describe('FeatureAccessGuard', () => {
  let guard: FeatureAccessGuard;
  let mockReflector: jest.Mocked<Reflector>;

  const mockRequest = {
    user: null as CurrentUser | null,
  };

  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;

  const createMockUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
    userId: 'user-1',
    email: 'user@example.com',
    organizationId: 'org-1',
    isPlatformAdmin: false,
    capabilities: ['basic'],
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      type: 'FARM_OPERATION',
      plan: 'basic',
      isVerified: true,
      isSuspended: false,
      allowedModules: ['farm_management'],
      features: ['farm_management'],
    },
    ...overrides,
  } as CurrentUser);

  beforeEach(() => {
    // Create deep mock for Reflector
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    // Create deep mocks for other dependencies
    const mockPlanFeatureMapper = {
      getFeaturesForPlan: jest.fn(),
      hasFeatureAccess: jest.fn(),
    } as any;

    const mockSubscriptionService = {
      getActiveSubscription: jest.fn(),
      hasFeatureAccess: jest.fn(),
    } as any;

    // Create guard instance with mocked dependencies
    guard = new FeatureAccessGuard(mockReflector, mockPlanFeatureMapper, mockSubscriptionService);

    // Reset mocks
    jest.clearAllMocks();
    mockReflector.getAllAndOverride.mockReset();
    mockRequest.user = null;
  });

  describe('canActivate', () => {
    it('should throw ForbiddenException when user context is not found', () => {
      mockRequest.user = null;

      expect(() => guard.canActivate(mockContext)).toThrow(
        new ForbiddenException('User context not found'),
      );
    });

    it('should return true for platform admin and bypass all restrictions', () => {
      mockRequest.user = createMockUser({ isPlatformAdmin: true });
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        [mockContext.getHandler(), mockContext.getClass()],
      );
    });

    describe('feature access', () => {
      it('should return true when no feature is required', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride.mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when user has access to required feature', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('farm_management') // required feature
          .mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when org type does not support feature', () => {
        mockRequest.user = createMockUser({
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            type: 'FARM_OPERATION',
            plan: 'basic',
            isVerified: true,
            isSuspended: false,
            allowedModules: ['farm_management'],
            features: ['farm_management'],
          },
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce('marketplace') // REQUIRE_FEATURE_KEY - FARM_OPERATION type doesn't support marketplace
          .mockReturnValue(undefined) // REQUIRE_CAPABILITY_KEY
          .mockReturnValue(undefined); // REQUIRE_ORG_TYPE_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException("Feature 'marketplace' is not available for FARM_OPERATION organizations"),
        );
      });

      it('should throw ForbiddenException when feature is not in allowed modules', () => {
        mockRequest.user = createMockUser({
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            type: 'INTEGRATED_FARM',
            plan: 'basic',
            isVerified: true,
            isSuspended: false,
            allowedModules: ['farm_management'], // marketplace not in allowed modules
            features: ['farm_management', 'marketplace'],
          },
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce('marketplace') // REQUIRE_FEATURE_KEY - INTEGRATED_FARM supports marketplace but not in allowed modules
          .mockReturnValue(undefined) // REQUIRE_CAPABILITY_KEY
          .mockReturnValue(undefined); // REQUIRE_ORG_TYPE_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException("Feature 'marketplace' is not enabled for your organization"),
        );
      });

      it('should throw ForbiddenException when feature is not in plan', () => {
        mockRequest.user = createMockUser({
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            type: 'INTEGRATED_FARM',
            plan: 'basic',
            isVerified: true,
            isSuspended: false,
            allowedModules: ['farm_management', 'marketplace'],
            features: ['farm_management'], // marketplace not in features
          },
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce('marketplace') // REQUIRE_FEATURE_KEY - marketplace not in features
          .mockReturnValue(undefined) // REQUIRE_CAPABILITY_KEY
          .mockReturnValue(undefined); // REQUIRE_ORG_TYPE_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException("Feature 'marketplace' is not included in your current plan. Please upgrade to access this feature."),
        );
      });
    });

    describe('capability access', () => {
      it('should return true when no capability is required', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride.mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when user has required capability', () => {
        mockRequest.user = createMockUser({ capabilities: ['advanced_analytics'] });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_FEATURE_KEY
          .mockReturnValueOnce('advanced_analytics') // REQUIRE_CAPABILITY_KEY
          .mockReturnValue(undefined); // REQUIRE_ORG_TYPE_KEY

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when user lacks required capability', () => {
        mockRequest.user = createMockUser({ capabilities: ['basic'] });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_FEATURE_KEY
          .mockReturnValueOnce('advanced_analytics') // REQUIRE_CAPABILITY_KEY
          .mockReturnValue(undefined); // REQUIRE_ORG_TYPE_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException("Your organization does not have the 'advanced_analytics' capability"),
        );
      });
    });

    describe('organization type access', () => {
      it('should return true when no org type is required', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride.mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when user org type matches required types', () => {
        mockRequest.user = createMockUser({
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            type: 'FARM_OPERATION',
            plan: 'basic',
            isVerified: true,
            isSuspended: false,
            allowedModules: ['farm_management'],
            features: ['farm_management'],
          },
        });
        mockReflector.getAllAndOverride
          .mockReturnValue(undefined) // no feature required
          .mockReturnValue(undefined) // no capability required
          .mockReturnValue(['FARM_OPERATION', 'INTEGRATED_FARM']); // required org types

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when user org type does not match required types', () => {
        mockRequest.user = createMockUser({
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            type: 'COMMODITY_TRADER',
            plan: 'basic',
            isVerified: true,
            isSuspended: false,
            allowedModules: ['marketplace'],
            features: ['marketplace'],
          },
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_FEATURE_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_CAPABILITY_KEY
          .mockReturnValueOnce(['FARM_OPERATION', 'INTEGRATED_FARM']); // REQUIRE_ORG_TYPE_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('This resource is only available to FARM_OPERATION, INTEGRATED_FARM organizations'),
        );
      });
    });

    describe('combined requirements', () => {
      it('should pass when all requirements are met', () => {
        mockRequest.user = createMockUser({
          capabilities: ['advanced_analytics'],
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            type: 'INTEGRATED_FARM',
            plan: 'basic',
            isVerified: true,
            isSuspended: false,
            allowedModules: ['farm_management', 'analytics'],
            features: ['farm_management', 'analytics'],
          },
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('analytics') // required feature
          .mockReturnValueOnce('advanced_analytics') // required capability
          .mockReturnValueOnce(['INTEGRATED_FARM']); // required org type

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should fail when any requirement is not met', () => {
        mockRequest.user = createMockUser({
          capabilities: ['basic'], // missing advanced_analytics
          organization: {
            id: 'org-1',
            name: 'Test Organization',
            type: 'INTEGRATED_FARM',
            plan: 'basic',
            isVerified: true,
            isSuspended: false,
            allowedModules: ['farm_management', 'analytics'],
            features: ['farm_management', 'analytics'],
          },
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce('analytics') // REQUIRE_FEATURE_KEY
          .mockReturnValueOnce('advanced_analytics') // REQUIRE_CAPABILITY_KEY
          .mockReturnValueOnce(['INTEGRATED_FARM']); // REQUIRE_ORG_TYPE_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException("Your organization does not have the 'advanced_analytics' capability"),
        );
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty capabilities array', () => {
      mockRequest.user = createMockUser({ capabilities: [] });
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
        .mockReturnValueOnce(undefined) // REQUIRE_FEATURE_KEY
        .mockReturnValueOnce('basic') // REQUIRE_CAPABILITY_KEY
        .mockReturnValue(undefined); // REQUIRE_ORG_TYPE_KEY

      expect(() => guard.canActivate(mockContext)).toThrow(
        new ForbiddenException("Your organization does not have the 'basic' capability"),
      );
    });

    it('should handle undefined organization', () => {
      mockRequest.user = createMockUser({ organization: undefined });
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
        .mockReturnValueOnce('farm_management') // REQUIRE_FEATURE_KEY
        .mockReturnValue(undefined) // REQUIRE_CAPABILITY_KEY
        .mockReturnValue(undefined); // REQUIRE_ORG_TYPE_KEY

      expect(() => guard.canActivate(mockContext)).toThrow();
    });

    it('should handle empty required org types array', () => {
      mockRequest.user = createMockUser();
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
        .mockReturnValueOnce(undefined) // REQUIRE_FEATURE_KEY
        .mockReturnValueOnce(undefined) // REQUIRE_CAPABILITY_KEY
        .mockReturnValueOnce([]); // REQUIRE_ORG_TYPE_KEY - empty array

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });
});
