import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityAssignmentGuard } from './activity-assignment.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

describe('ActivityAssignmentGuard', () => {
  let guard: ActivityAssignmentGuard;
  let mockPrismaService: any;

  beforeEach(() => {
    // Use simple Jest mocks for PrismaService (complex types)
    mockPrismaService = {
      farmActivity: {
        findUnique: jest.fn(),
      },
    };

    // Create guard instance with mocked dependencies
    guard = new ActivityAssignmentGuard(mockPrismaService);
  });

  const mockRequest = {
    user: null as CurrentUser | null,
    params: { id: null as string | null, activityId: null as string | null },
    activity: null as any,
  };

  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as ExecutionContext;

  const createMockUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
    userId: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    organizationId: 'org-1',
    isPlatformAdmin: false,
    permissions: [],
    roles: [{ 
      id: 'role-1',
      name: 'Field Worker', 
      level: 20,
      scope: 'FARM' as any,
      farmId: 'farm-1'
    }],
    organization: {
      id: 'org-1',
      name: 'Test Farm',
      type: 'FARM' as any,
      plan: 'basic',
      features: ['farm_management'],
      allowedModules: ['farm_management'],
      isVerified: true,
      isSuspended: false,
    },
    capabilities: [],
    ...overrides,
  } as CurrentUser);

  const createMockActivity = (overrides: any = {}) => ({
    id: 'activity-1',
    farmId: 'farm-1',
    createdById: 'user-1',
    status: 'SCHEDULED',
    farm: {
      organizationId: 'org-1',
    },
    assignments: [],
    ...overrides,
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockRequest.user = null;
    mockRequest.params.id = null;
    mockRequest.params.activityId = null;
    mockRequest.activity = null;
  });

  describe('canActivate', () => {
    it('should throw ForbiddenException when activity ID is not provided', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params.id = null;
      mockRequest.params.activityId = null;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Activity ID is required'),
      );
    });

    it('should throw ForbiddenException when activity is not found', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new NotFoundException('Activity not found'),
      );
    });

    it('should return true for platform admin accessing any activity', async () => {
      const activity = createMockActivity();
      mockRequest.user = createMockUser({ isPlatformAdmin: true });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.activity).toEqual(activity);
    });

    it('should throw ForbiddenException when activity belongs to different organization', async () => {
      const activity = createMockActivity({
        farm: { organizationId: 'org-2' },
      });
      mockRequest.user = createMockUser({ organizationId: 'org-1' });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied to this activity'),
      );
    });

    it('should return true when user is assigned to activity', async () => {
      const activity = createMockActivity({
        assignments: [{ id: 'assignment-1', role: 'ASSIGNED' }],
      });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.activity).toEqual(activity);
    });

    it('should return true when user is the creator of activity', async () => {
      const activity = createMockActivity({
        createdById: 'user-1',
        assignments: [], // No assignments
      });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.activity).toEqual(activity);
    });

    it('should return true when user has manager role', async () => {
      const activity = createMockActivity({
        createdById: 'user-2',
        assignments: [], // No assignments
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [{ id: 'role-2', name: 'Manager', level: 50, scope: 'FARM' as any, farmId: 'farm-1' }],
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.activity).toEqual(activity);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      const activity = createMockActivity({
        createdById: 'user-2',
        assignments: [], // No assignments
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [{ id: 'role-1', name: 'Field Worker', level: 20, scope: 'FARM' as any, farmId: 'farm-1' }], // Low level role
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Not assigned to this activity'),
      );
    });

    it('should use activityId param when id param is not available', async () => {
      const activity = createMockActivity({
        assignments: [{ id: 'assignment-1', role: 'ASSIGNED' }],
      });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = null;
      mockRequest.params.activityId = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockPrismaService.farmActivity.findUnique).toHaveBeenCalledWith({
        where: { id: 'activity-1' },
        select: {
          id: true,
          farmId: true,
          createdById: true,
          status: true,
          farm: {
            select: {
              organizationId: true,
            },
          },
          assignments: {
            where: {
              userId: 'user-1',
              isActive: true,
            },
            select: {
              id: true,
              role: true,
            },
          },
        },
      });
    });
  });

  describe('assignment scenarios', () => {
    it('should allow access with multiple assignments', async () => {
      const activity = createMockActivity({
        assignments: [
          { id: 'assignment-1', role: 'ASSIGNED' },
          { id: 'assignment-2', role: 'OBSERVER' },
        ],
      });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access with inactive assignment (filtered out)', async () => {
      const activity = createMockActivity({
        assignments: [], // Inactive assignments are filtered out
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [{ id: 'role-2', name: 'Manager', level: 50, scope: 'FARM' as any, farmId: 'farm-1' }], // Manager role allows access
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('role level scenarios', () => {
    it('should allow access with role level exactly at threshold', async () => {
      const activity = createMockActivity({
        createdById: 'user-2',
        assignments: [],
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [{ id: 'role-2', name: 'Manager', level: 50, scope: 'FARM' as any, farmId: 'farm-1' }], // Exactly 50
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access with role level above threshold', async () => {
      const activity = createMockActivity({
        createdById: 'user-2',
        assignments: [],
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [{ id: 'role-3', name: 'Admin', level: 80, scope: 'FARM' as any, farmId: 'farm-1' }], // Above 50
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access with role level below threshold', async () => {
      const activity = createMockActivity({
        createdById: 'user-2',
        assignments: [],
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [{ id: 'role-1', name: 'Field Worker', level: 20, scope: 'FARM' as any, farmId: 'farm-1' }], // Below 50
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Not assigned to this activity'),
      );
    });

    it('should handle user with multiple roles and use highest level', async () => {
      const activity = createMockActivity({
        createdById: 'user-2',
        assignments: [],
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [
          { id: 'role-1', name: 'Field Worker', level: 20, scope: 'FARM' as any, farmId: 'farm-1' },
          { id: 'role-2', name: 'Manager', level: 50, scope: 'FARM' as any, farmId: 'farm-1' },
          { id: 'role-4', name: 'Supervisor', level: 30, scope: 'FARM' as any, farmId: 'farm-1' },
        ],
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors gracefully', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow('Database error');
    });

    it('should handle user with no roles', async () => {
      const activity = createMockActivity({
        createdById: 'user-2',
        assignments: [],
      });
      mockRequest.user = createMockUser({
        userId: 'user-1',
        roles: [],
      });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Not assigned to this activity'),
      );
    });

    it('should handle null organizationId in activity farm', async () => {
      const activity = createMockActivity({
        farm: { organizationId: null },
      });
      mockRequest.user = createMockUser({ organizationId: 'org-1' });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied to this activity'),
      );
    });

    it('should handle user with null organizationId', async () => {
      const activity = createMockActivity();
      mockRequest.user = createMockUser({ organizationId: null });
      mockRequest.params.id = 'activity-1';
      mockPrismaService.farmActivity.findUnique.mockResolvedValue(activity);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied to this activity'),
      );
    });
  });
});
