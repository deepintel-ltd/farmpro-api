import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AnalyticsPermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AnalyticsPermissionsService', () => {
  let service: AnalyticsPermissionsService;
  let prismaService: PrismaService;

  const mockUser: CurrentUser = {
    userId: 'test-user-id',
    email: 'test@example.com',
    organizationId: 'test-org-id',
  };

  const mockUserRecord = {
    id: 'test-user-id',
    organizationId: 'test-org-id',
    isActive: true,
    userRoles: [
      {
        isActive: true,
        role: {
          permissions: [
            {
              granted: true,
              permission: { resource: 'analytics', action: 'read' }
            },
            {
              granted: true,
              permission: { resource: 'finance', action: 'read' }
            },
            {
              granted: true,
              permission: { resource: 'market', action: 'read' }
            },
            {
              granted: true,
              permission: { resource: 'reports', action: 'read' }
            },
            {
              granted: true,
              permission: { resource: 'reports', action: 'create' }
            }
          ]
        }
      }
    ]
  };

  const mockFarm = {
    id: 'test-farm-id',
    organizationId: 'test-org-id',
    name: 'Test Farm'
  };

  const mockCommodity = {
    id: 'test-commodity-id',
    name: 'Test Commodity'
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findFirst: jest.fn()
      },
      farm: {
        findFirst: jest.fn()
      },
      commodity: {
        findFirst: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsPermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ],
    }).compile();

    service = module.get<AnalyticsPermissionsService>(AnalyticsPermissionsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAnalyticsPermission', () => {
    it('should not throw when user has analytics:read permission', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.checkAnalyticsPermission(mockUser, 'read')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks analytics:read permission', async () => {
      const userWithoutPermission = {
        ...mockUserRecord,
        userRoles: [{
          isActive: true,
          role: {
            permissions: [
              { granted: true, permission: { resource: 'finance', action: 'read' } }
            ]
          }
        }]
      };
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(userWithoutPermission);

      await expect(service.checkAnalyticsPermission(mockUser, 'read')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not found', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(service.checkAnalyticsPermission(mockUser, 'read')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkFinanceAnalyticsPermission', () => {
    it('should not throw when user has finance:read permission', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.checkFinanceAnalyticsPermission(mockUser)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks finance:read permission', async () => {
      const userWithoutPermission = {
        ...mockUserRecord,
        userRoles: [{
          isActive: true,
          role: {
            permissions: [
              { granted: true, permission: { resource: 'analytics', action: 'read' } }
            ]
          }
        }]
      };
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(userWithoutPermission);

      await expect(service.checkFinanceAnalyticsPermission(mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkMarketResearchPermission', () => {
    it('should not throw when user has market:read permission', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.checkMarketResearchPermission(mockUser)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks market:read permission', async () => {
      const userWithoutPermission = {
        ...mockUserRecord,
        userRoles: [{
          isActive: true,
          role: {
            permissions: [
              { granted: true, permission: { resource: 'analytics', action: 'read' } }
            ]
          }
        }]
      };
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(userWithoutPermission);

      await expect(service.checkMarketResearchPermission(mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkFarmAnalyticsAccess', () => {
    it('should not throw when farm belongs to user organization', async () => {
      jest.spyOn(prismaService.farm, 'findFirst').mockResolvedValue(mockFarm);

      await expect(service.checkFarmAnalyticsAccess(mockUser, 'test-farm-id')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when farm not found', async () => {
      jest.spyOn(prismaService.farm, 'findFirst').mockResolvedValue(null);

      await expect(service.checkFarmAnalyticsAccess(mockUser, 'test-farm-id')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkCommodityAnalyticsAccess', () => {
    it('should not throw when commodity exists', async () => {
      jest.spyOn(prismaService.commodity, 'findFirst').mockResolvedValue(mockCommodity);

      await expect(service.checkCommodityAnalyticsAccess(mockUser, 'test-commodity-id')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when commodity not found', async () => {
      jest.spyOn(prismaService.commodity, 'findFirst').mockResolvedValue(null);

      await expect(service.checkCommodityAnalyticsAccess(mockUser, 'test-commodity-id')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkOrganizationAnalyticsAccess', () => {
    it('should not throw when user belongs to organization', async () => {
      await expect(service.checkOrganizationAnalyticsAccess(mockUser, 'test-org-id')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user belongs to different organization', async () => {
      await expect(service.checkOrganizationAnalyticsAccess(mockUser, 'other-org-id')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateDashboardAccess', () => {
    it('should not throw when user has analytics permission and farm access', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);
      jest.spyOn(prismaService.farm, 'findFirst').mockResolvedValue(mockFarm);

      await expect(service.validateDashboardAccess(mockUser, 'test-farm-id')).resolves.not.toThrow();
    });

    it('should not throw when user has analytics permission and no specific farm', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.validateDashboardAccess(mockUser)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks analytics permission', async () => {
      const userWithoutPermission = {
        ...mockUserRecord,
        userRoles: [{
          isActive: true,
          role: {
            permissions: [
              { granted: true, permission: { resource: 'finance', action: 'read' } }
            ]
          }
        }]
      };
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(userWithoutPermission);

      await expect(service.validateDashboardAccess(mockUser, 'test-farm-id')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateProfitabilityAccess', () => {
    it('should not throw when user has finance permission and farm access', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);
      jest.spyOn(prismaService.farm, 'findFirst').mockResolvedValue(mockFarm);

      await expect(service.validateProfitabilityAccess(mockUser, 'test-farm-id')).resolves.not.toThrow();
    });

    it('should not throw when user has finance permission and no specific farm', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.validateProfitabilityAccess(mockUser)).resolves.not.toThrow();
    });
  });

  describe('validateMarketResearchAccess', () => {
    it('should not throw when user has market permission and commodity access', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);
      jest.spyOn(prismaService.commodity, 'findFirst').mockResolvedValue(mockCommodity);

      await expect(service.validateMarketResearchAccess(mockUser, 'test-commodity-id')).resolves.not.toThrow();
    });

    it('should not throw when user has market permission and no specific commodity', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.validateMarketResearchAccess(mockUser)).resolves.not.toThrow();
    });
  });

  describe('validatePlanningAccess', () => {
    it('should not throw when user has analytics permission and farm access', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);
      jest.spyOn(prismaService.farm, 'findFirst').mockResolvedValue(mockFarm);

      await expect(service.validatePlanningAccess(mockUser, 'test-farm-id')).resolves.not.toThrow();
    });

    it('should not throw when user has analytics permission and no specific farm', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.validatePlanningAccess(mockUser)).resolves.not.toThrow();
    });
  });

  describe('validateDataExportPermission', () => {
    it('should not throw when user has reports:create permission', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUserRecord);

      await expect(service.validateDataExportPermission(mockUser)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks reports:create permission', async () => {
      const userWithoutPermission = {
        ...mockUserRecord,
        userRoles: [{
          isActive: true,
          role: {
            permissions: [
              { granted: true, permission: { resource: 'reports', action: 'read' } }
            ]
          }
        }]
      };
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(userWithoutPermission);

      await expect(service.validateDataExportPermission(mockUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
