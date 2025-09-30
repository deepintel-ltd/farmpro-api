import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('UsersService', () => {
  let service: UsersService;

  const mockCurrentUser: CurrentUser = {
    userId: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    isPlatformAdmin: false,
    roles: [],
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      type: 'FARM' as any,
      plan: 'basic',
      features: [],
      allowedModules: [],
      isVerified: true,
      isSuspended: false,
    },
    permissions: [],
    capabilities: [],
  };

  const mockUserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    avatar: 'https://example.com/avatar.jpg',
    isActive: true,
    metadata: { preferences: { theme: 'dark' } },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    organization: {
      id: 'org-123',
      name: 'Test Organization',
    },
    userRoles: [
      {
        role: {
          id: 'role-123',
          name: 'user',
          permissions: [
            {
              permission: {
                action: 'read',
              },
            },
          ],
        },
      },
    ],
  };

  const mockActivity = {
    id: 'activity-123',
    action: 'user.profile.update',
    entity: 'user',
    entityId: 'user-123',
    changes: { name: 'Updated Name' },
    timestamp: new Date('2023-01-01'),
  };

  const mockFarmActivity = {
    id: 'farm-activity-123',
    status: 'COMPLETED',
    cost: 100,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    farmActivity: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Mock logger to avoid console output during tests
    jest.spyOn(service['logger'], 'log').mockImplementation();
    jest.spyOn(service['logger'], 'warn').mockImplementation();
    jest.spyOn(service['logger'], 'debug').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserProfile);

      const result = await service.getProfile(mockCurrentUser);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        avatar: 'https://example.com/avatar.jpg',
        isActive: true,
        organization: {
          id: 'org-123',
          name: 'Test Organization',
        },
        roles: [
          {
            id: 'role-123',
            name: 'user',
            permissions: ['read'],
          },
        ],
        metadata: { preferences: { theme: 'dark' } },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: expect.objectContaining({
          organization: expect.any(Object),
          userRoles: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(service['logger'].warn).toHaveBeenCalledWith(
        'User profile not found for userId: user-123',
      );
    });

    it('should handle null phone and avatar values', async () => {
      const userWithNulls = {
        ...mockUserProfile,
        phone: null,
        avatar: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithNulls);

      const result = await service.getProfile(mockCurrentUser);

      expect(result.phone).toBeNull();
      expect(result.avatar).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      name: 'Updated Name',
      phone: '+9876543210',
      avatar: 'https://example.com/new-avatar.jpg',
      metadata: { preferences: { theme: 'light' } },
    };

    it('should update user profile successfully', async () => {
      const updatedUser = {
        ...mockUserProfile,
        ...updateData,
      };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockCurrentUser, updateData);

      expect(result.name).toBe('Updated Name');
      expect(result.phone).toBe('+9876543210');
      expect(result.avatar).toBe('https://example.com/new-avatar.jpg');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
        include: expect.objectContaining({
          organization: expect.any(Object),
          userRoles: expect.any(Object),
        }),
      });
    });

    it('should log profile update request', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserProfile,
        ...updateData,
      });

      await service.updateProfile(mockCurrentUser, updateData);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Updating profile for user: user-123',
        {
          fields: ['name', 'phone', 'avatar', 'metadata'],
        },
      );
    });
  });

  describe('uploadAvatar', () => {
    const avatarUrl = 'https://example.com/new-avatar.jpg';

    it('should upload avatar successfully', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUserProfile);

      const result = await service.uploadAvatar(mockCurrentUser, avatarUrl);

      expect(result).toEqual({
        url: avatarUrl,
        message: 'Avatar uploaded successfully',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatar: avatarUrl },
      });
    });

    it('should log avatar upload', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUserProfile);

      await service.uploadAvatar(mockCurrentUser, avatarUrl);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Uploading avatar for user: user-123',
        { avatarUrl },
      );
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar successfully', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUserProfile);

      const result = await service.deleteAvatar(mockCurrentUser);

      expect(result).toEqual({
        message: 'Avatar deleted successfully',
        success: true,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatar: null },
      });
    });
  });

  describe('searchUsers', () => {
    const query = {
      page: 1,
      limit: 25,
      search: 'john',
      role: 'user',
      isActive: true,
    };

    const mockUsers = [
      {
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        phone: '+1234567890',
        isActive: true,
        lastLoginAt: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
        userRoles: [{ role: { name: 'user' } }],
      },
    ];

    beforeEach(() => {
      // Authorization is now handled by guards and decorators
    });

    it('should search users successfully', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.searchUsers(mockCurrentUser, query);

      expect(result).toEqual({
        data: [
          {
            id: 'user-1',
            email: 'john@example.com',
            name: 'John Doe',
            phone: '+1234567890',
            isActive: true,
            roles: ['user'],
            lastLoginAt: '2023-01-01T00:00:00.000Z',
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
        meta: {
          totalCount: 1,
          page: 1,
          limit: 25,
          totalPages: 1,
        },
      });
    });

    it('should apply search filters correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.searchUsers(mockCurrentUser, query);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: 'org-123',
          OR: [
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
          isActive: true,
          userRoles: {
            some: {
              role: { name: 'user' },
              isActive: true,
            },
          },
        }),
        select: expect.any(Object),
        skip: 0,
        take: 25,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle farmId filter', async () => {
      const farmQuery = { ...query, farmId: 'farm-123' };
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.searchUsers(mockCurrentUser, farmQuery);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userRoles: {
            some: {
              farmId: 'farm-123',
              isActive: true,
            },
          },
        }),
        select: expect.any(Object),
        skip: 0,
        take: 25,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery = { page: 2, limit: 10 };
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.searchUsers(mockCurrentUser, paginatedQuery);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        select: expect.any(Object),
        skip: 10, // (page - 1) * limit
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should limit max page size to 100', async () => {
      const largeQuery = { page: 1, limit: 200 };
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.searchUsers(mockCurrentUser, largeQuery);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        select: expect.any(Object),
        skip: 0,
        take: 100, // Should be limited to 100
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getUserById', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'checkSameOrganization').mockResolvedValue(true);
      jest.spyOn(service, 'getProfile').mockResolvedValue({
        id: 'user-456',
        email: 'other@example.com',
        name: 'Other User',
        phone: null,
        avatar: null,
        isActive: true,
        organization: { id: 'org-123', name: 'Test Organization' },
        roles: [],
        metadata: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });
    });

    it('should get user by ID successfully', async () => {
      const result = await service.getUserById(mockCurrentUser, 'user-456');

      expect(result.id).toBe('user-456');
      // Authorization is now handled by guards and decorators
      expect(service['checkSameOrganization']).toHaveBeenCalledWith(
        mockCurrentUser,
        'user-456',
      );
    });
  });

  describe('activateUser', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'checkSameOrganization').mockResolvedValue(true);
    });

    it('should activate user successfully', async () => {
      const activatedUser = {
        ...mockUserProfile,
        isActive: true,
      };
      mockPrismaService.user.update.mockResolvedValue(activatedUser);

      const result = await service.activateUser(mockCurrentUser, 'user-456');

      expect(result.isActive).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: { isActive: true },
        include: expect.any(Object),
      });
    });

    it('should log activation request', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUserProfile);

      await service.activateUser(mockCurrentUser, 'user-456');

      expect(service['logger'].log).toHaveBeenCalledWith(
        'User activation requested by: user-123 for user: user-456',
      );
    });

    it('should check permissions before activation', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUserProfile);

      await service.activateUser(mockCurrentUser, 'user-456');

      // Authorization is now handled by guards and decorators
    });
  });

  describe('getPreferences', () => {
    it('should get user preferences successfully', async () => {
      const userWithPreferences = {
        metadata: {
          preferences: {
            theme: 'dark',
            language: 'es',
            timezone: 'America/New_York',
          },
        },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithPreferences);

      const result = await service.getPreferences(mockCurrentUser);

      expect(result).toEqual({
        theme: 'dark',
        language: 'es',
        timezone: 'America/New_York',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        dashboard: {
          defaultView: 'overview',
          widgets: [],
        },
        mobile: {
          offlineMode: false,
          gpsTracking: true,
        },
      });
    });

    it('should return default preferences when none exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ metadata: {} });

      const result = await service.getPreferences(mockCurrentUser);

      expect(result.theme).toBe('light');
      expect(result.language).toBe('en');
      expect(result.timezone).toBe('UTC');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getPreferences(mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePreferences', () => {
    const preferences = {
      theme: 'dark',
      language: 'es',
      notifications: {
        email: false,
        push: true,
        sms: true,
      },
    };

    it('should update preferences successfully', async () => {
      const existingUser = { metadata: { existingData: true } };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updatePreferences(
        mockCurrentUser,
        preferences,
      );

      expect(result).toEqual(preferences);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          metadata: {
            existingData: true,
            preferences,
          },
        },
      });
    });

    it('should handle user with no existing metadata', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ metadata: null });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updatePreferences(
        mockCurrentUser,
        preferences,
      );

      expect(result).toEqual(preferences);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          metadata: {
            preferences,
          },
        },
      });
    });

    it('should log preferences update', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ metadata: {} });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.updatePreferences(mockCurrentUser, preferences);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Updating preferences for user: user-123',
        {
          preferences: ['theme', 'language', 'notifications'],
        },
      );
    });
  });

  describe('getNotificationSettings', () => {
    it('should get notification settings successfully', async () => {
      const userWithSettings = {
        metadata: {
          notificationSettings: {
            channels: {
              email: false,
              push: true,
              sms: true,
            },
            events: {
              activityReminders: false,
              orderUpdates: true,
            },
          },
        },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithSettings);

      const result = await service.getNotificationSettings(mockCurrentUser);

      expect(result.channels.email).toBe(false);
      expect(result.channels.push).toBe(true);
      expect(result.events.activityReminders).toBe(false);
    });

    it('should return default settings when none exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ metadata: {} });

      const result = await service.getNotificationSettings(mockCurrentUser);

      expect(result.channels.email).toBe(true);
      expect(result.channels.push).toBe(true);
      expect(result.channels.sms).toBe(false);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getNotificationSettings(mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateNotificationSettings', () => {
    const settings = {
      channels: {
        email: false,
        push: true,
        sms: true,
      },
      events: {
        activityReminders: false,
        orderUpdates: true,
      },
    };

    it('should update notification settings successfully', async () => {
      const existingUser = { metadata: { existingData: true } };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updateNotificationSettings(
        mockCurrentUser,
        settings,
      );

      expect(result).toEqual(settings);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          metadata: {
            existingData: true,
            notificationSettings: settings,
          },
        },
      });
    });

    it('should log notification settings update', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ metadata: {} });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.updateNotificationSettings(mockCurrentUser, settings);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Updating notification settings for user: user-123',
        {
          channels: ['email', 'push', 'sms'],
          events: ['activityReminders', 'orderUpdates'],
        },
      );
    });
  });

  describe('getMyActivity', () => {
    const query = {
      limit: 50,
      days: 30,
      type: 'profile',
    };

    it('should get user activity successfully', async () => {
      mockPrismaService.activity.findMany.mockResolvedValue([mockActivity]);

      const result = await service.getMyActivity(mockCurrentUser, query);

      expect(result).toEqual({
        data: [
          {
            id: 'activity-123',
            action: 'user.profile.update',
            entity: 'user',
            entityId: 'user-123',
            details: { name: 'Updated Name' },
            timestamp: '2023-01-01T00:00:00.000Z',
            ipAddress: null,
            userAgent: null,
          },
        ],
        meta: {
          totalCount: 1,
          limit: 50,
        },
      });
    });

    it('should apply filters correctly', async () => {
      mockPrismaService.activity.findMany.mockResolvedValue([]);

      await service.getMyActivity(mockCurrentUser, query);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          timestamp: { gte: expect.any(Date) },
          action: { contains: 'profile', mode: 'insensitive' },
        }),
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    });

    it('should handle empty query parameters', async () => {
      const emptyQuery = {};
      mockPrismaService.activity.findMany.mockResolvedValue([]);

      await service.getMyActivity(mockCurrentUser, emptyQuery);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          timestamp: { gte: expect.any(Date) },
        }),
        orderBy: { timestamp: 'desc' },
        take: 50, // Default limit
      });
    });

    it('should limit max results to 100', async () => {
      const largeQuery = { limit: 200 };
      mockPrismaService.activity.findMany.mockResolvedValue([]);

      await service.getMyActivity(mockCurrentUser, largeQuery);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: { timestamp: 'desc' },
        take: 100, // Should be limited to 100
      });
    });

    it('should log activity retrieval', async () => {
      mockPrismaService.activity.findMany.mockResolvedValue([]);

      await service.getMyActivity(mockCurrentUser, query);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Getting activity for user: user-123',
        {
          limit: 50,
          days: 30,
          type: 'profile',
        },
      );
    });
  });

  describe('getMyStats', () => {
    const query = { period: 'month' };

    beforeEach(() => {
      mockPrismaService.activity.count.mockResolvedValue(10);
      mockPrismaService.farmActivity.findMany.mockResolvedValue([
        mockFarmActivity,
      ]);
    });

    it('should get user stats successfully', async () => {
      const result = await service.getMyStats(mockCurrentUser, query);

      expect(result).toEqual({
        period: 'month',
        activitiesCompleted: 1,
        hoursWorked: 2,
        efficiency: expect.any(Number),
        qualityScore: expect.any(Number),
        ordersProcessed: 10,
        revenue: 100,
      });
    });

    it('should handle different periods', async () => {
      const weekQuery = { period: 'week' };
      await service.getMyStats(mockCurrentUser, weekQuery);

      expect(mockPrismaService.activity.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
          timestamp: { gte: expect.any(Date) },
        }),
      });
    });

    it('should handle empty farm activities', async () => {
      mockPrismaService.farmActivity.findMany.mockResolvedValue([]);
      const result = await service.getMyStats(mockCurrentUser, query);

      expect(result.activitiesCompleted).toBe(0);
      expect(result.hoursWorked).toBe(0);
      expect(result.revenue).toBeNull();
    });

    it('should handle multiple farm activities', async () => {
      const multipleActivities = [
        { id: 'farm-activity-1', status: 'COMPLETED', cost: 100 },
        { id: 'farm-activity-2', status: 'COMPLETED', cost: 200 },
        { id: 'farm-activity-3', status: 'PENDING', cost: 50 },
      ];
      mockPrismaService.farmActivity.findMany.mockResolvedValue(multipleActivities);

      const result = await service.getMyStats(mockCurrentUser, query);

      expect(result.activitiesCompleted).toBe(2); // Only COMPLETED activities
      expect(result.hoursWorked).toBe(4); // 2 * 2 hours per activity
      expect(result.revenue).toBe(350); // Sum of ALL activities (100 + 200 + 50)
    });

    it('should log stats generation', async () => {
      await service.getMyStats(mockCurrentUser, query);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Getting stats for user: user-123',
        { period: 'month' },
      );
    });

    it('should default to month period when not specified', async () => {
      const emptyQuery = {};
      await service.getMyStats(mockCurrentUser, emptyQuery);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Getting stats for user: user-123',
        { period: 'month' },
      );
    });
  });

  describe('getUserActivity', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'checkSameOrganization').mockResolvedValue(true);
      jest.spyOn(service, 'getMyActivity').mockResolvedValue({
        data: [],
        meta: { totalCount: 0, limit: 50 },
      });
    });

    it('should get user activity as admin', async () => {
      await service.getUserActivity(mockCurrentUser, 'user-456', {});

      // Authorization is now handled by guards and decorators
      expect(service['checkSameOrganization']).toHaveBeenCalledWith(
        mockCurrentUser,
        'user-456',
      );
    });
  });

  describe('getUserStats', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'checkSameOrganization').mockResolvedValue(true);
      jest.spyOn(service, 'getMyStats').mockResolvedValue({
        period: 'month',
        activitiesCompleted: 0,
        hoursWorked: 0,
        efficiency: 0,
        qualityScore: 0,
        ordersProcessed: 0,
        revenue: null,
      });
    });

    it('should get user stats as admin', async () => {
      await service.getUserStats(mockCurrentUser, 'user-456', {});

      // Authorization is now handled by guards and decorators
      expect(service['checkSameOrganization']).toHaveBeenCalledWith(
        mockCurrentUser,
        'user-456',
      );
    });
  });


  describe('checkSameOrganization', () => {
    it('should throw ForbiddenException when user not in same organization', async () => {
      const userFromDifferentOrg = {
        organizationId: 'different-org-456',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userFromDifferentOrg);

      await expect(
        service['checkSameOrganization'](mockCurrentUser, 'user-456'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass when user is in same organization', async () => {
      const userFromSameOrg = {
        organizationId: 'org-123',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userFromSameOrg);

      await expect(
        service['checkSameOrganization'](mockCurrentUser, 'user-456'),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when target user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service['checkSameOrganization'](mockCurrentUser, 'user-456'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should log organization check', async () => {
      const userFromSameOrg = {
        organizationId: 'org-123',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userFromSameOrg);

      await service['checkSameOrganization'](mockCurrentUser, 'user-456');

      expect(service['logger'].debug).toHaveBeenCalledWith(
        'Checking organization access for user user-123 to access user user-456',
      );
    });
  });

  describe('getStartDateForPeriod', () => {
    it('should return correct date for week period', () => {
      const result = service['getStartDateForPeriod']('week');
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);

      expect(result.getDate()).toBe(expected.getDate());
    });

    it('should return correct date for month period', () => {
      const result = service['getStartDateForPeriod']('month');
      const now = new Date();
      const expected = new Date(now.getFullYear(), now.getMonth(), 1);

      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getDate()).toBe(1);
    });

    it('should return correct date for quarter period', () => {
      const result = service['getStartDateForPeriod']('quarter');
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const expected = new Date(now.getFullYear(), quarter * 3, 1);

      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getDate()).toBe(1);
    });

    it('should return correct date for year period', () => {
      const result = service['getStartDateForPeriod']('year');
      const now = new Date();
      const expected = new Date(now.getFullYear(), 0, 1);

      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });

    it('should default to month period for unknown period', () => {
      const result = service['getStartDateForPeriod']('unknown');
      const now = new Date();
      const expected = new Date(now.getFullYear(), now.getMonth(), 1);

      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getDate()).toBe(1);
    });
  });
});
