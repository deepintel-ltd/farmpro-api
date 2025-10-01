import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderOwnershipGuard } from './order-ownership.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

describe('OrderOwnershipGuard', () => {
  let guard: OrderOwnershipGuard;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
  };

  const mockRequest = {
    user: null as CurrentUser | null,
    params: { id: null as string | null },
    order: null as any,
  };

  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as ExecutionContext;

  const createMockUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
    userId: 'user-1',
    email: 'user@example.com',
    organizationId: 'org-1',
    isPlatformAdmin: false,
    permissions: [],
    roles: [],
    organization: {
      id: 'org-1',
      type: 'FARM',
      isSuspended: false,
      allowedModules: ['farm_management'],
      features: ['farm_management'],
    },
    ...overrides,
  } as CurrentUser);

  const createMockOrder = (overrides: any = {}) => ({
    id: 'order-1',
    buyerOrgId: 'org-1',
    supplierOrgId: 'org-2',
    createdById: 'user-1',
    status: 'DRAFT',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderOwnershipGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<OrderOwnershipGuard>(OrderOwnershipGuard);

    // Reset mocks
    jest.clearAllMocks();
    mockRequest.user = null;
    mockRequest.params.id = null;
    mockRequest.order = null;
  });

  describe('canActivate', () => {
    it('should throw ForbiddenException when order ID is not provided', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params.id = null;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Order ID is required'),
      );
    });

    it('should throw ForbiddenException when order ID is empty string', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params.id = '';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Order ID is required'),
      );
    });

    it('should throw ForbiddenException when order is not found', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new NotFoundException('Order not found'),
      );
    });

    it('should return true for platform admin accessing any order', async () => {
      const order = createMockOrder();
      mockRequest.user = createMockUser({ isPlatformAdmin: true });
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.order).toEqual(order);
    });

    it('should return true when user is the order creator', async () => {
      const order = createMockOrder({ createdById: 'user-1' });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.order).toEqual(order);
    });

    it('should throw ForbiddenException when user is not the order creator', async () => {
      const order = createMockOrder({ createdById: 'user-2' });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Only order creator can perform this action'),
      );
    });

    it('should use existing order from request if available', async () => {
      const order = createMockOrder({ createdById: 'user-1' });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'order-1';
      mockRequest.order = order; // Order already attached to request

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockPrismaService.order.findUnique).not.toHaveBeenCalled();
      expect(mockRequest.order).toEqual(order);
    });

    it('should attach order to request after fetching from database', async () => {
      const order = createMockOrder({ createdById: 'user-1' });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        select: {
          id: true,
          buyerOrgId: true,
          supplierOrgId: true,
          createdById: true,
          status: true,
        },
      });
      expect(mockRequest.order).toEqual(order);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors gracefully', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow('Database error');
    });

    it('should handle undefined order ID in params', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params = { id: undefined as any }; // No id property

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Order ID is required'),
      );
    });

    it('should handle null order ID in params', async () => {
      mockRequest.user = createMockUser();
      mockRequest.params = { id: null };

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Order ID is required'),
      );
    });

    it('should handle user with null userId', async () => {
      const order = createMockOrder({ createdById: 'user-1' });
      mockRequest.user = createMockUser({ userId: null });
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Only order creator can perform this action'),
      );
    });

    it('should handle order with null createdById', async () => {
      const order = createMockOrder({ createdById: null });
      mockRequest.user = createMockUser({ userId: 'user-1' });
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Only order creator can perform this action'),
      );
    });
  });

  describe('platform admin scenarios', () => {
    it('should allow platform admin to access order created by different user', async () => {
      const order = createMockOrder({ createdById: 'user-2' });
      mockRequest.user = createMockUser({ 
        isPlatformAdmin: true,
        userId: 'admin-1',
        email: 'admin@platform.com'
      });
      mockRequest.params.id = 'order-1';
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.order).toEqual(order);
    });

    it('should allow platform admin to access order even when not in request', async () => {
      const order = createMockOrder({ createdById: 'user-2' });
      mockRequest.user = createMockUser({ isPlatformAdmin: true });
      mockRequest.params.id = 'order-1';
      mockRequest.order = null; // No order in request
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.order).toEqual(order);
    });
  });
});
