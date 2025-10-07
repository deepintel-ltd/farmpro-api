import { EmailVerificationService } from './email-verification.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let mockPrismaService: any;
  let mockBrevoService: any;

  beforeEach(() => {
    // Create deep mocks for dependencies
    mockPrismaService = {
      emailVerification: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    mockBrevoService = {
      sendEmailVerification: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    // Create service instance with mocked dependencies
    service = new EmailVerificationService(mockPrismaService, mockBrevoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmailVerification', () => {
    it('should send email verification successfully', async () => {
      mockPrismaService.emailVerification.create.mockResolvedValue({
        id: 'verification-id',
        token: 'test-token',
        tokenHash: 'hashed-token',
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: new Date(),
        requestedAt: new Date(),
        isUsed: false,
      });

      mockBrevoService.sendEmailVerification.mockResolvedValue(undefined);

      await service.sendEmailVerification('user-123', 'test@example.com', 'John');

      expect(mockPrismaService.emailVerification.create).toHaveBeenCalledWith({
        data: {
          token: expect.any(String),
          tokenHash: expect.any(String),
          userId: 'user-123',
          email: 'test@example.com',
          expiresAt: expect.any(Date),
          requestedAt: expect.any(Date),
        },
      });

      expect(mockBrevoService.sendEmailVerification).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String), // token
        expect.stringContaining('verify-email?token='), // verificationUrl
        { firstName: 'John' } // userData
      );
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.emailVerification.create.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(
        service.sendEmailVerification('user-123', 'test@example.com', 'John')
      ).resolves.toBeUndefined();
    });
  });

  describe('verifyEmailWithToken', () => {
    it('should verify email successfully', async () => {
      const mockVerification = {
        id: 'verification-id',
        userId: 'user-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: false,
        },
      };

      mockPrismaService.emailVerification.findFirst.mockResolvedValue(mockVerification);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.emailVerification.update.mockResolvedValue({});

      const result = await service.verifyEmailWithToken('test-token');

      expect(result).toEqual({
        message: 'Email successfully verified. You can now log in to your account.',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { emailVerified: true },
      });

      expect(mockPrismaService.emailVerification.update).toHaveBeenCalledWith({
        where: { id: 'verification-id' },
        data: {
          isUsed: true,
          usedAt: expect.any(Date),
        },
      });
    });

    it('should throw error for invalid token', async () => {
      mockPrismaService.emailVerification.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmailWithToken('invalid-token')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for already verified email', async () => {
      const mockVerification = {
        id: 'verification-id',
        userId: 'user-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true, // Already verified
        },
      };

      mockPrismaService.emailVerification.findFirst.mockResolvedValue(mockVerification);

      await expect(service.verifyEmailWithToken('test-token')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      mockBrevoService.sendWelcomeEmail.mockResolvedValue(undefined);

      await service.sendWelcomeEmail('test@example.com', 'John', 'Doe', 'Test Company');

      expect(mockBrevoService.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com', {
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company',
      });
    });

    it('should handle errors gracefully', async () => {
      mockBrevoService.sendWelcomeEmail.mockRejectedValue(new Error('Email service error'));

      // Should not throw
      await expect(
        service.sendWelcomeEmail('test@example.com', 'John', 'Doe', 'Test Company')
      ).resolves.toBeUndefined();
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend verification for unverified user', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        emailVerified: false,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.emailVerification.count.mockResolvedValue(1); // Under rate limit
      mockPrismaService.emailVerification.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.emailVerification.create.mockResolvedValue({});
      mockBrevoService.sendEmailVerification.mockResolvedValue(undefined);

      const result = await service.resendEmailVerification('test@example.com');

      expect(result.message).toContain('verification link');
      expect(mockPrismaService.emailVerification.updateMany).toHaveBeenCalled();
    });

    it('should return generic message for verified user', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        emailVerified: true, // Already verified
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.resendEmailVerification('test@example.com');

      expect(result.message).toContain('verification link');
      expect(mockPrismaService.emailVerification.updateMany).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        emailVerified: false,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.emailVerification.count.mockResolvedValue(3); // At rate limit

      await expect(service.resendEmailVerification('test@example.com')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
