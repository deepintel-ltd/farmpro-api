import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OrganizationIsolationGuard, BYPASS_ORG_ISOLATION_KEY } from './organization-isolation.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { createMock } from '@golevelup/ts-jest';

describe('OrganizationIsolationGuard', () => {
  let guard: OrganizationIsolationGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  const mockRequest = {
    user: null as CurrentUser | null,
    organizationFilter: null as any,
  };

  beforeEach(() => {
    mockReflector = createMock<Reflector>();
    mockExecutionContext = createMock<ExecutionContext>();
    
    mockExecutionContext.switchToHttp.mockReturnValue({
      getRequest: () => mockRequest,
    } as any);

    guard = new OrganizationIsolationGuard(mockReflector);

    // Reset mocks
    jest.clearAllMocks();
    mockRequest.user = null;
    mockRequest.organizationFilter = null;
  });

  describe('canActivate', () => {
    it('should return true when bypass is enabled', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY check
        .mockReturnValueOnce(true); // BYPASS_ORG_ISOLATION_KEY check
      mockRequest.user = null; // No user needed when bypassed

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        BYPASS_ORG_ISOLATION_KEY,
        [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
      );
    });

    it('should throw ForbiddenException when user context is not found', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = null;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('User context not found'),
      );
    });

    it('should return true for platform admin and bypass organization isolation', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-1',
        email: 'admin@platform.com',
        organizationId: 'org-1',
        isPlatformAdmin: true,
        roles: [{ id: 'role-1', name: 'platform_admin', level: 1, scope: 'PLATFORM' }],
        permissions: ['all'],
        capabilities: ['all'],
        organization: {
          id: 'org-1',
          name: 'Platform Organization',
          type: 'INTEGRATED_FARM',
          plan: 'enterprise',
          isVerified: true,
          isSuspended: false,
          allowedModules: ['all'],
          features: ['all'],
        },
      } as CurrentUser;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationFilter).toBeNull(); // Should not set filter for platform admin
    });

    it('should throw ForbiddenException when user has no organization', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-1',
        email: 'user@example.com',
        organizationId: null,
        isPlatformAdmin: false,
        roles: [],
        permissions: [],
        capabilities: [],
        organization: null,
      } as CurrentUser;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('User must belong to an organization'),
      );
    });

    it('should throw ForbiddenException when organization is suspended', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-1',
        email: 'user@example.com',
        organizationId: 'org-1',
        isPlatformAdmin: false,
        roles: [{ id: 'role-1', name: 'user', level: 1, scope: 'FARM' }],
        permissions: ['read'],
        capabilities: ['basic'],
        organization: {
          id: 'org-1',
          name: 'Test Organization',
          type: 'FARM_OPERATION',
          plan: 'basic',
          isVerified: true,
          isSuspended: true,
          allowedModules: ['farm_management'],
          features: ['farm_management'],
        },
      } as CurrentUser;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Your organization has been suspended. Please contact support.'),
      );
    });

    it('should return true and set organization filter for valid user', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-1',
        email: 'user@example.com',
        organizationId: 'org-1',
        isPlatformAdmin: false,
        roles: [{ id: 'role-1', name: 'user', level: 1, scope: 'FARM' }],
        permissions: ['read'],
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
      } as CurrentUser;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationFilter).toEqual({
        organizationId: 'org-1',
      });
    });

    it('should handle undefined organization gracefully', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-1',
        email: 'user@example.com',
        organizationId: 'org-1',
        isPlatformAdmin: false,
        roles: [{ id: 'role-1', name: 'user', level: 1, scope: 'FARM' }],
        permissions: ['read'],
        capabilities: ['basic'],
        organization: undefined,
      } as CurrentUser;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty organizationId', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-1',
        email: 'user@example.com',
        organizationId: '',
        isPlatformAdmin: false,
        roles: [{ id: 'role-1', name: 'user', level: 1, scope: 'FARM' }],
        permissions: ['read'],
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
      } as CurrentUser;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('User must belong to an organization'),
      );
    });

    it('should handle null organizationId', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-1',
        email: 'user@example.com',
        organizationId: null,
        isPlatformAdmin: false,
        roles: [{ id: 'role-1', name: 'user', level: 1, scope: 'FARM' }],
        permissions: ['read'],
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
      } as CurrentUser;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('User must belong to an organization'),
      );
    });
  });
});
