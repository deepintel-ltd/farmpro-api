import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationImpersonationMiddleware } from './organization-impersonation.middleware';
import { PrismaService } from '@/prisma/prisma.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { NextFunction } from 'express';

describe('OrganizationImpersonationMiddleware', () => {
  let middleware: OrganizationImpersonationMiddleware;
  let prismaService: PrismaService;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationImpersonationMiddleware,
        {
          provide: PrismaService,
          useValue: {
            organization: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    middleware = module.get<OrganizationImpersonationMiddleware>(OrganizationImpersonationMiddleware);
    prismaService = module.get<PrismaService>(PrismaService);

    mockRequest = {
      headers: {},
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        isPlatformAdmin: true,
        organizationId: 'org-1',
      },
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set user organization when no header provided', async () => {
    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.organizationFilter).toEqual({
      organizationId: 'org-1',
      isImpersonation: false,
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should allow platform admin to impersonate organization', async () => {
    const targetOrgId = 'org-2';
    mockRequest.headers['x-organization-id'] = targetOrgId;

    prismaService.organization.findUnique = jest.fn().mockResolvedValue({
      id: targetOrgId,
      name: 'Target Organization',
      isActive: true,
      suspendedAt: null,
    });

    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.organizationFilter).toEqual({
      organizationId: targetOrgId,
      isImpersonation: true,
    });
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Impersonated-Organization', targetOrgId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Impersonated-Organization-Name', 'Target Organization');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject non-platform admin using X-Organization-Id header', async () => {
    mockRequest.user.isPlatformAdmin = false;
    mockRequest.headers['x-organization-id'] = 'org-2';

    await expect(middleware.use(mockRequest, mockResponse, mockNext))
      .rejects.toThrow(ForbiddenException);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject impersonation of non-existent organization', async () => {
    mockRequest.headers['x-organization-id'] = 'non-existent-org';

    prismaService.organization.findUnique = jest.fn().mockResolvedValue(null);

    await expect(middleware.use(mockRequest, mockResponse, mockNext))
      .rejects.toThrow(UnauthorizedException);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject impersonation of inactive organization', async () => {
    const targetOrgId = 'org-2';
    mockRequest.headers['x-organization-id'] = targetOrgId;

    prismaService.organization.findUnique = jest.fn().mockResolvedValue({
      id: targetOrgId,
      name: 'Target Organization',
      isActive: false,
      suspendedAt: null,
    });

    await expect(middleware.use(mockRequest, mockResponse, mockNext))
      .rejects.toThrow(UnauthorizedException);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject impersonation of suspended organization', async () => {
    const targetOrgId = 'org-2';
    mockRequest.headers['x-organization-id'] = targetOrgId;

    prismaService.organization.findUnique = jest.fn().mockResolvedValue({
      id: targetOrgId,
      name: 'Target Organization',
      isActive: true,
      suspendedAt: new Date(),
    });

    await expect(middleware.use(mockRequest, mockResponse, mockNext))
      .rejects.toThrow(UnauthorizedException);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should skip processing for unauthenticated requests', async () => {
    mockRequest.user = null;

    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.organizationFilter).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
