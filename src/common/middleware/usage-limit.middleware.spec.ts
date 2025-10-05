import { UsageLimitMiddleware } from './usage-limit.middleware';
import { SubscriptionService } from '@/billing/services/subscription.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('UsageLimitMiddleware', () => {
  let middleware: UsageLimitMiddleware;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockRequest = {
    method: 'POST',
    path: '/users',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      organizationId: 'org-1',
      isPlatformAdmin: false,
    },
  } as any;

  const mockResponse = {
    setHeader: jest.fn(),
  } as any;

  const mockNext = jest.fn();

  beforeEach(() => {
    // Create deep mocks for dependencies
    subscriptionService = {
      checkLimit: jest.fn(),
      getCurrentSubscriptionInternal: jest.fn(),
    } as any;

    prismaService = {
      user: {
        count: jest.fn().mockResolvedValue(0),
      },
      farm: {
        count: jest.fn().mockResolvedValue(0),
      },
      farmActivity: {
        count: jest.fn().mockResolvedValue(0),
      },
      marketplaceListing: {
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;

    // Create middleware instance with mocked dependencies
    middleware = new UsageLimitMiddleware(subscriptionService, prismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform Admin Bypass', () => {
    it('should skip limit checking for platform admins', async () => {
      mockRequest.user.isPlatformAdmin = true;

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Non-Authenticated Requests', () => {
    it('should skip limit checking for non-authenticated requests', async () => {
      mockRequest.user = null;

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Resource Creation Limits', () => {
    beforeEach(() => {
      // Reset mockRequest to default state
      mockRequest.user = {
        id: 'user-1',
        email: 'test@example.com',
        organizationId: 'org-1',
        isPlatformAdmin: false,
      };
      mockRequest.method = 'POST';
      mockRequest.path = '/users';
    });

    it('should allow resource creation when within limits', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(2);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 5,
        isUnlimited: false,
      });

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).toHaveBeenCalledWith('org-1', 'users', 2);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block resource creation when limit exceeded', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(5);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: false,
        limit: 5,
        isUnlimited: false,
      });

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext)
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should add warning header when approaching limit', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(4);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 5,
        isUnlimited: false,
      });

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Usage-Warning',
        'users usage at 80.0%'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not add warning header for unlimited plans', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(100);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: -1,
        isUnlimited: true,
      });

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Resource Type Detection', () => {
    beforeEach(() => {
      // Reset mockRequest to default state
      mockRequest.user = {
        id: 'user-1',
        email: 'test@example.com',
        organizationId: 'org-1',
        isPlatformAdmin: false,
      };
      mockRequest.method = 'POST';
    });

    it('should detect users endpoint', async () => {
      mockRequest.path = '/users';
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 5,
        isUnlimited: false,
      });

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).toHaveBeenCalledWith('org-1', 'users', 1);
    });

    it('should detect farms endpoint', async () => {
      mockRequest.path = '/farms';
      (prismaService.farm.count as jest.Mock).mockResolvedValue(1);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 5,
        isUnlimited: false,
      });

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).toHaveBeenCalledWith('org-1', 'farms', 1);
    });

    it('should detect activities endpoint', async () => {
      mockRequest.path = '/activities';
      // Mock the private method by accessing it through bracket notation
      (subscriptionService as any)['getCurrentSubscriptionInternal'] = jest.fn().mockResolvedValue({
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-01-31'),
      });
      (prismaService.farmActivity.count as jest.Mock).mockResolvedValue(10);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 100,
        isUnlimited: false,
      });

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).toHaveBeenCalledWith('org-1', 'activities', 10);
    });

    it('should detect listings endpoint', async () => {
      mockRequest.path = '/listings';
      (prismaService.marketplaceListing.count as jest.Mock).mockResolvedValue(3);
      subscriptionService.checkLimit.mockResolvedValue({
        allowed: true,
        limit: 10,
        isUnlimited: false,
      });

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).toHaveBeenCalledWith('org-1', 'listings', 3);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Reset mockRequest to default state
      mockRequest.user = {
        id: 'user-1',
        email: 'test@example.com',
        organizationId: 'org-1',
        isPlatformAdmin: false,
      };
      mockRequest.method = 'POST';
    });

    it('should not block request on limit check error', async () => {
      mockRequest.path = '/users';
      subscriptionService.checkLimit.mockRejectedValue(new Error('Database error'));

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should still block on ForbiddenException', async () => {
      mockRequest.path = '/users';
      subscriptionService.checkLimit.mockRejectedValue(new ForbiddenException('Limit exceeded'));

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext)
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Non-Creation Requests', () => {
    it('should skip limit checking for GET requests', async () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/users';

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip limit checking for non-resource endpoints', async () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/auth/login';

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(subscriptionService.checkLimit).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
