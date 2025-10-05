import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
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
    name: 'Test User',
    organizationId: 'org-1',
    isPlatformAdmin: false,
    permissions: ['farm_management:read', 'farm_management:create'],
    roles: [
      { id: 'role-1', name: 'Farm Manager', level: 50, scope: 'FARM' as any, farmId: 'farm-1' },
      { id: 'role-2', name: 'Field Worker', level: 20, scope: 'FARM' as any, farmId: 'farm-1' },
    ],
    organization: {
      id: 'org-1',
      name: 'Test Organization',
      type: 'FARM_OPERATION' as any,
      plan: 'basic',
      isVerified: true,
      isSuspended: false,
      allowedModules: ['farm_management'],
      features: ['farm_management'],
    },
    capabilities: ['basic'],
    ...overrides,
  } as CurrentUser);

  beforeEach(() => {
    // Create deep mock for Reflector
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    // Create guard instance with mocked dependencies
    guard = new PermissionsGuard(mockReflector);

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

    it('should return true when no requirements are specified', () => {
      mockRequest.user = createMockUser();
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    describe('permission checks', () => {
      it('should return true when user has required permission', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce({ resource: 'farm_management', action: 'read' })
          .mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when platform admin has any permission', () => {
        mockRequest.user = createMockUser({
          isPlatformAdmin: true,
          permissions: [], // No specific permissions needed
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce({ resource: 'admin', action: 'delete' })
          .mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when user lacks required permission', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce({ resource: 'admin', action: 'delete' }) // REQUIRE_PERMISSION_KEY
          .mockReturnValue(undefined) // REQUIRE_ROLE_KEY
          .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('You do not have permission to delete admin'),
        );
      });

      it('should handle case-sensitive permission matching', () => {
        mockRequest.user = createMockUser({
          permissions: ['Farm_Management:Read'], // Different case
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce({ resource: 'farm_management', action: 'read' }) // REQUIRE_PERMISSION_KEY
          .mockReturnValue(undefined) // REQUIRE_ROLE_KEY
          .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('You do not have permission to read farm_management'),
        );
      });
    });

    describe('role checks', () => {
      it('should return true when user has required role', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce({ roleName: 'Farm Manager' }) // REQUIRE_ROLE_KEY
          .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when platform admin bypasses role check', () => {
        mockRequest.user = createMockUser({
          isPlatformAdmin: true,
          roles: [], // No roles needed
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // no permission required
          .mockReturnValueOnce({ roleName: 'Admin', allowPlatformAdmin: true })
          .mockReturnValue(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when platform admin is not allowed to bypass', () => {
        mockRequest.user = createMockUser({
          isPlatformAdmin: true,
          roles: [], // No roles
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce({ roleName: 'Admin', allowPlatformAdmin: false }) // REQUIRE_ROLE_KEY
          .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException("You must have the 'Admin' role to access this resource"),
        );
      });

      it('should throw ForbiddenException when user lacks required role', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce({ roleName: 'Admin' }) // REQUIRE_ROLE_KEY
          .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException("You must have the 'Admin' role to access this resource"),
        );
      });

      it('should handle case-insensitive role matching', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce({ roleName: 'farm manager' }) // REQUIRE_ROLE_KEY - lowercase
          .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('role level checks', () => {
      it('should return true when user has sufficient role level', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_ROLE_KEY
          .mockReturnValueOnce(30); // REQUIRE_ROLE_LEVEL_KEY

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should return true when platform admin has maximum level', () => {
        mockRequest.user = createMockUser({
          isPlatformAdmin: true,
          roles: [], // No roles needed
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // no permission required
          .mockReturnValueOnce(undefined) // no role required
          .mockReturnValueOnce(100); // very high level

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when user role level is insufficient', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_ROLE_KEY
          .mockReturnValueOnce(80); // REQUIRE_ROLE_LEVEL_KEY - higher than user's max (50)

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your role level is insufficient to access this resource'),
        );
      });

      it('should handle user with no roles', () => {
        mockRequest.user = createMockUser({
          roles: [],
        });
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce(undefined) // REQUIRE_ROLE_KEY
          .mockReturnValueOnce(10); // REQUIRE_ROLE_LEVEL_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your role level is insufficient to access this resource'),
        );
      });
    });

    describe('combined requirements', () => {
      it('should pass when all requirements are met', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce({ resource: 'farm_management', action: 'read' }) // REQUIRE_PERMISSION_KEY
          .mockReturnValueOnce({ roleName: 'Farm Manager' }) // REQUIRE_ROLE_KEY
          .mockReturnValueOnce(30); // REQUIRE_ROLE_LEVEL_KEY

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should fail when any requirement is not met', () => {
        mockRequest.user = createMockUser();
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
          .mockReturnValueOnce({ resource: 'admin', action: 'delete' }) // REQUIRE_PERMISSION_KEY - user doesn't have this permission
          .mockReturnValueOnce({ roleName: 'Farm Manager' }) // REQUIRE_ROLE_KEY
          .mockReturnValueOnce(30); // REQUIRE_ROLE_LEVEL_KEY

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('You do not have permission to delete admin'),
        );
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty permissions array', () => {
      mockRequest.user = createMockUser({ permissions: [] });
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
        .mockReturnValueOnce({ resource: 'farm_management', action: 'read' }) // REQUIRE_PERMISSION_KEY
        .mockReturnValue(undefined) // REQUIRE_ROLE_KEY
        .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

      expect(() => guard.canActivate(mockContext)).toThrow(
        new ForbiddenException('You do not have permission to read farm_management'),
      );
    });

    it('should handle empty roles array', () => {
      mockRequest.user = createMockUser({ roles: [] });
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // IS_PUBLIC_KEY
        .mockReturnValueOnce(undefined) // REQUIRE_PERMISSION_KEY
        .mockReturnValueOnce({ roleName: 'Farm Manager' }) // REQUIRE_ROLE_KEY
        .mockReturnValue(undefined); // REQUIRE_ROLE_LEVEL_KEY

      expect(() => guard.canActivate(mockContext)).toThrow(
        new ForbiddenException("You must have the 'Farm Manager' role to access this resource"),
      );
    });

    it('should handle undefined role level requirement', () => {
      mockRequest.user = createMockUser();
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined); // no role level required

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should handle zero role level requirement', () => {
      mockRequest.user = createMockUser({ roles: [] });
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(0); // zero level required

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });
});
