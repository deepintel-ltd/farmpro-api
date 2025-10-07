import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import { createHash } from 'crypto';

describe('Auth E2E Tests', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up auth-related tables before each test
    await testContext.cleanupTables([
      'email_verifications',
      'users',
      'organizations'
    ]);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        name: 'New User',
        phone: '+1234567890',
        organizationName: 'New Organization',
        organizationType: 'FARM_OPERATION'
      };

      const response = await testContext
        .request()
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.user.email).toBe(registerData.email);
      expect(response.body.data.attributes.user.name).toBe(registerData.name);
      expect(response.body.data.attributes.tokens.accessToken).toBeDefined();
      expect(response.body.data.attributes.tokens.refreshToken).toBeDefined();
      expect(response.body.data.attributes.user.emailVerified).toBe(false);
    });

    it('should fail to register with existing email', async () => {
      // First registration
      const registerData = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
        phone: '+1234567890',
        organizationName: 'Existing Organization',
        organizationType: 'FARM_OPERATION'
      };

      await testContext
        .request()
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      // Second registration with same email should fail
      await testContext
        .request()
        .post('/auth/register')
        .send(registerData)
        .expect(409);
    });

    it('should fail to register with invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        name: '',
        organizationName: '',
        organizationType: 'INVALID_TYPE'
      };

      await testContext
        .request()
        .post('/auth/register')
        .send(invalidData)
        .expect(400);
    });

    it('should create organization and admin role for new user', async () => {
      const registerData = {
        email: 'orgtest@example.com',
        password: 'Password123!',
        name: 'Org Test User',
        phone: '+1234567890',
        organizationName: 'Test Org',
        organizationType: 'COMMODITY_TRADER'
      };

      const response = await testContext
        .request()
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      const userId = response.body.data.attributes.user.id;
      
      // Check that organization was created
      const organization = await testContext.prisma.organization.findFirst({
        where: { name: 'Test Org' }
      });
      expect(organization).toBeDefined();
      expect(organization?.type).toBe('COMMODITY_TRADER');

      // Check that admin role was created and assigned
      const userRoles = await testContext.prisma.userRole.findMany({
        where: { userId },
        include: { role: true }
      });
      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].role.name).toBe('admin');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await hash('LoginPassword123!');
      await testContext.createUser({
        email: 'logintest@example.com',
        name: 'Login Test User',
        phone: '+1234567890',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'LoginPassword123!'
      };

      const response = await testContext
        .request()
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.user.email).toBe(loginData.email);
      expect(response.body.data.attributes.tokens.accessToken).toBeDefined();
      expect(response.body.data.attributes.tokens.refreshToken).toBeDefined();
    });

    it('should fail to login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      await testContext
        .request()
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should fail to login with invalid password', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'WrongPassword123!'
      };

      await testContext
        .request()
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should fail to login with inactive user', async () => {
      // Create inactive user
      const hashedPassword = await hash('Password123!');
      await testContext.createUser({
        email: 'inactive@example.com',
        name: 'Inactive User',
        hashedPassword,
        emailVerified: true,
        isActive: false
      });

      const loginData = {
        email: 'inactive@example.com',
        password: 'Password123!'
      };

      await testContext
        .request()
        .post('/auth/login')
        .send(loginData)
        .expect(403);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      const hashedPassword = await hash('RefreshPassword123!');
      await testContext.createUser({
        email: 'refreshtest@example.com',
        name: 'Refresh Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      // Login to get tokens
      const loginResponse = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'refreshtest@example.com',
          password: 'RefreshPassword123!'
        })
        .expect(200);

      refreshToken = loginResponse.body.data.attributes.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await testContext
        .request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.accessToken).toBeDefined();
      expect(response.body.data.attributes.refreshToken).toBeDefined();
      // Note: Access token might be the same due to JWT generation timing, but refresh token should be different
      expect(response.body.data.attributes.refreshToken).not.toBe(refreshToken);
    });

    it('should fail to refresh with invalid refresh token', async () => {
      await testContext
        .request()
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and get access token
      const hashedPassword = await hash('LogoutPassword123!');
      await testContext.createUser({
        email: 'logouttest@example.com',
        name: 'Logout Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      const loginResponse = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'logouttest@example.com',
          password: 'LogoutPassword123!'
        })
        .expect(200);

      accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      await testContext
        .request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);
    });

    it('should fail to logout without token', async () => {
      await testContext
        .request()
        .post('/auth/logout')
        .expect(401);
    });

    it('should fail to logout with invalid token', async () => {
      await testContext
        .request()
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and get access token
      const hashedPassword = await hash('MePassword123!');
      await testContext.createUser({
        email: 'metest@example.com',
        name: 'Me Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      const loginResponse = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'metest@example.com',
          password: 'MePassword123!'
        })
        .expect(200);

      accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    });

    it('should get current user profile with valid token', async () => {
      const response = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('user');
      expect(response.body.data.attributes.email).toBe('metest@example.com');
      expect(response.body.data.attributes.name).toBe('Me Test User');
      expect(response.body.data.attributes.organization).toBeDefined();
    });

    it('should fail to get profile without token', async () => {
      await testContext
        .request()
        .get('/auth/me')
        .expect(401);
    });

    it('should fail to get profile with invalid token', async () => {
      await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/refresh - Expired Token', () => {
    it('should fail to refresh with expired refresh token', async () => {
      // Create user and login
      const hashedPassword = await hash('RefreshPassword123!');
      const user = await testContext.createUser({
        email: 'refreshtest@example.com',
        name: 'Refresh Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      const loginResponse = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'refreshtest@example.com',
          password: 'RefreshPassword123!'
        })
        .expect(200);

      const { refreshToken } = loginResponse.body.data.attributes.tokens;

      // Simulate expired refresh token by updating user metadata
      await testContext.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokenExpiresAt: new Date(Date.now() - 1000) // Expired
        }
      });

      await testContext
        .request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should initiate password reset for valid email', async () => {
      // Create user
      const hashedPassword = await hash('ForgotPassword123!');
      await testContext.createUser({
        email: 'forgottest@example.com',
        name: 'Forgot Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      const response = await testContext
        .request()
        .post('/auth/forgot-password')
        .send({ email: 'forgottest@example.com' })
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.message).toContain('password reset');

      // Verify reset token was stored in user metadata
      const user = await testContext.prisma.user.findUnique({
        where: { email: 'forgottest@example.com' }
      });
      expect(user?.metadata).toHaveProperty('resetTokenHash');
      expect(user?.metadata).toHaveProperty('resetTokenExpiresAt');
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await testContext
        .request()
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.message).toContain('password reset');
    });

    it('should fail with invalid email format', async () => {
      await testContext
        .request()
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    let resetToken: string;
    let user: any;

    beforeEach(async () => {
      // Create user and generate reset token
      const hashedPassword = await hash('ResetPassword123!');
      user = await testContext.createUser({
        email: 'resettest@example.com',
        name: 'Reset Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      // Generate reset token (simulating forgot password flow)
      const token = 'test-reset-token-' + Date.now();
      const tokenHash = createHash('sha256').update(token).digest('hex');
      
      await testContext.prisma.user.update({
        where: { id: user.id },
        data: {
          metadata: {
            resetTokenHash: tokenHash,
            resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
          }
        }
      });

      resetToken = token;
    });

    it('should reset password with valid token', async () => {
      const response = await testContext
        .request()
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.message).toContain('successfully');

      // Verify user can login with new password
      await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'resettest@example.com',
          password: 'NewPassword123!'
        })
        .expect(200);

      // Verify old password no longer works
      await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'resettest@example.com',
          password: 'ResetPassword123!'
        })
        .expect(401);
    });

    it('should fail with invalid token', async () => {
      await testContext
        .request()
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!'
        })
        .expect(401);
    });

    it('should fail with expired token', async () => {
      // Update token to be expired
      await testContext.prisma.user.update({
        where: { id: user.id },
        data: {
          metadata: {
            resetTokenHash: createHash('sha256').update(resetToken).digest('hex'),
            resetTokenExpiresAt: new Date(Date.now() - 1000).toISOString() // Expired
          }
        }
      });

      await testContext
        .request()
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!'
        })
        .expect(401);
    });

    it('should fail with weak password', async () => {
      await testContext
        .request()
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'weak'
        })
        .expect(400);
    });
  });

  describe('POST /auth/change-password', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and login
      const hashedPassword = await hash('ChangePassword123!');
      await testContext.createUser({
        email: 'changetest@example.com',
        name: 'Change Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      const loginResponse = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'changetest@example.com',
          password: 'ChangePassword123!'
        })
        .expect(200);

      accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    });

    it('should change password with valid current password', async () => {
      const response = await testContext
        .request()
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'ChangePassword123!',
          newPassword: 'NewChangePassword123!'
        })
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.message).toContain('successfully');

      // Verify user can login with new password
      await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'changetest@example.com',
          password: 'NewChangePassword123!'
        })
        .expect(200);

      // Verify old password no longer works
      await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'changetest@example.com',
          password: 'ChangePassword123!'
        })
        .expect(401);
    });

    it('should fail with incorrect current password', async () => {
      await testContext
        .request()
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewChangePassword123!'
        })
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .post('/auth/change-password')
        .send({
          currentPassword: 'ChangePassword123!',
          newPassword: 'NewChangePassword123!'
        })
        .expect(401);
    });

    it('should fail with weak new password', async () => {
      await testContext
        .request()
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'ChangePassword123!',
          newPassword: 'weak'
        })
        .expect(400);
    });
  });

  describe('POST /auth/validate-token', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and login
      const hashedPassword = await hash('ValidatePassword123!');
      await testContext.createUser({
        email: 'validatetest@example.com',
        name: 'Validate Test User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      const loginResponse = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'validatetest@example.com',
          password: 'ValidatePassword123!'
        })
        .expect(200);

      accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    });

    it('should validate valid token', async () => {
      const response = await testContext
        .request()
        .post('/auth/validate-token')
        .send({ token: accessToken })
        .expect(200);

      expect(response.body.data.type).toBe('token');
      expect(response.body.data.attributes.id).toBeDefined();
      expect(response.body.data.attributes.email).toBeDefined();
    });

    it('should invalidate invalid token', async () => {
      await testContext
        .request()
        .post('/auth/validate-token')
        .send({ token: 'invalid-token' })
        .expect(401);
    });

    it('should invalidate expired token', async () => {
      // Create an expired token by generating one with past expiration
      const { JwtService } = await import('@nestjs/jwt');
      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET || 'test-secret',
        signOptions: { expiresIn: '-1h' }, // Expired 1 hour ago
      });

      const expiredToken = jwtService.sign({
        email: 'validatetest@example.com',
        sub: 'some-user-id',
        organizationId: 'some-org-id',
      });
      
      await testContext
        .request()
        .post('/auth/validate-token')
        .send({ token: expiredToken })
        .expect(401);
    });
  });

  describe('POST /auth/verify-email', () => {
    let verificationToken: string;

    beforeEach(async () => {
      // Create user with unverified email
      const hashedPassword = await hash('VerifyPassword123!');
      const user = await testContext.createUser({
        email: 'verifytest@example.com',
        name: 'Verify Test User',
        hashedPassword,
        emailVerified: false,
        isActive: true
      });

      // Create email verification token
      const token = 'test-verify-token-' + Date.now();
      const tokenHash = createHash('sha256').update(token).digest('hex');
      
      await testContext.prisma.emailVerification.create({
        data: {
          token,
          tokenHash,
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          requestedAt: new Date()
        }
      });

      verificationToken = token;
    });

    it('should verify email with valid token', async () => {
      const response = await testContext
        .request()
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.message).toContain('verified');

      // Verify user email is now verified
      const user = await testContext.prisma.user.findUnique({
        where: { email: 'verifytest@example.com' }
      });
      expect(user?.emailVerified).toBe(true);
    });

    it('should fail with invalid token', async () => {
      await testContext
        .request()
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(401);
    });

    it('should fail with expired token', async () => {
      // Update token to be expired
      await testContext.prisma.emailVerification.updateMany({
        where: { token: verificationToken },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });

      await testContext
        .request()
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(401);
    });
  });

  describe('POST /auth/complete-profile', () => {
    let accessToken: string;
    let incompleteUser: any;

    beforeEach(async () => {
      // Create OAuth user with incomplete profile
      incompleteUser = await testContext.prisma.user.create({
        data: {
          email: 'oauthuser@example.com',
          name: 'OAuth User',
          avatar: 'https://example.com/avatar.jpg',
          emailVerified: true,
          isActive: true,
          profileComplete: false,
          authProvider: 'GOOGLE',
          organizationId: null,
        },
      });

      // Since OAuth users don't have passwords, we'll manually generate a token
      // This would normally come from the OAuth callback
      const { JwtService } = await import('@nestjs/jwt');
      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET || 'test-secret',
        signOptions: { expiresIn: '1h' },
      });

      accessToken = jwtService.sign({
        email: incompleteUser.email,
        sub: incompleteUser.id,
        organizationId: null,
      });
    });

    it('should complete profile for OAuth user', async () => {
      const completeProfileData = {
        organizationName: 'OAuth Test Farm',
        organizationType: 'FARM_OPERATION',
        phone: '+1234567890',
      };

      const response = await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(completeProfileData)
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.user.profileComplete).toBe(true);
      expect(response.body.data.attributes.user.organizationId).toBeTruthy();
      expect(response.body.data.attributes.user.organization).toBeDefined();
      expect(response.body.data.attributes.user.organization.name).toBe('OAuth Test Farm');
      expect(response.body.data.attributes.user.organization.type).toBe('FARM_OPERATION');
      expect(response.body.data.attributes.user.phone).toBe('+1234567890');
      expect(response.body.data.attributes.tokens.accessToken).toBeDefined();
      expect(response.body.data.attributes.tokens.refreshToken).toBeDefined();

      // Verify organization was created
      const organization = await testContext.prisma.organization.findFirst({
        where: { name: 'OAuth Test Farm' },
      });
      expect(organization).toBeDefined();
      expect(organization?.type).toBe('FARM_OPERATION');

      // Verify admin role was assigned
      const userRoles = await testContext.prisma.userRole.findMany({
        where: { userId: incompleteUser.id },
        include: { role: true },
      });
      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].role.name).toBe('admin');

      // Verify user was updated
      const updatedUser = await testContext.prisma.user.findUnique({
        where: { id: incompleteUser.id },
      });
      expect(updatedUser?.profileComplete).toBe(true);
      expect(updatedUser?.organizationId).toBe(organization?.id);
    });

    it('should fail if profile already complete', async () => {
      // First, complete the profile
      await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationName: 'First Org',
          organizationType: 'FARM_OPERATION',
        })
        .expect(200);

      // Try to complete again
      await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationName: 'Second Org',
          organizationType: 'FARM_OPERATION',
        })
        .expect(409);
    });

    it('should fail if organization name already exists', async () => {
      // Create organization with the name we'll try to use
      await testContext.prisma.organization.create({
        data: {
          name: 'Existing Org',
          type: 'FARM_OPERATION',
          email: 'existing@example.com',
          isActive: true,
          plan: 'basic',
          maxUsers: 5,
          maxFarms: 1,
        },
      });

      await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationName: 'Existing Org',
          organizationType: 'FARM_OPERATION',
        })
        .expect(409);
    });

    it('should fail with invalid organization type', async () => {
      await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationName: 'Test Farm',
          organizationType: 'INVALID_TYPE',
        })
        .expect(422);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .post('/auth/complete-profile')
        .send({
          organizationName: 'Test Farm',
          organizationType: 'FARM_OPERATION',
        })
        .expect(401);
    });

    it('should fail with missing organization name', async () => {
      await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationType: 'FARM_OPERATION',
        })
        .expect(400);
    });

    it('should complete profile without optional phone', async () => {
      const response = await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationName: 'No Phone Org',
          organizationType: 'COMMODITY_TRADER',
        })
        .expect(200);

      expect(response.body.data.attributes.user.phone).toBeNull();
    });

    it('should create organization with correct features based on type', async () => {
      await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationName: 'Features Test Org',
          organizationType: 'LOGISTICS_PROVIDER',
        })
        .expect(200);

      const organization = await testContext.prisma.organization.findFirst({
        where: { name: 'Features Test Org' },
      });

      expect(organization).toBeDefined();
      expect(organization?.type).toBe('LOGISTICS_PROVIDER');
      expect(organization?.plan).toBe('basic');
      expect(organization?.features).toBeDefined();
      expect(organization?.allowedModules).toBeDefined();
    });
  });

  describe('Auth Flow Integration Tests', () => {
    it('should complete full registration to login flow', async () => {
      // 1. Register new user
      const registerData = {
        email: 'integration@example.com',
        password: 'Integration123!',
        name: 'Integration User',
        phone: '+1234567890',
        organizationName: 'Integration Org',
        organizationType: 'FARM_OPERATION'
      };

      const registerResponse = await testContext
        .request()
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      const { accessToken, refreshToken } = registerResponse.body.data.attributes.tokens;

      // 2. Verify user can access protected endpoint
      await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 3. Refresh tokens
      const refreshResponse = await testContext
        .request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshResponse.body.data.attributes.accessToken;

      // 4. Use new token to access protected endpoint
      await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // 5. Logout
      await testContext
        .request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({})
        .expect(200);

      // 6. Verify token is invalidated
      await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(401);
    });

    it('should handle concurrent login attempts', async () => {
      const loginData = {
        email: 'concurrent@example.com',
        password: 'Concurrent123!'
      };

      // Create user
      const hashedPassword = await hash(loginData.password);
      await testContext.createUser({
        email: loginData.email,
        name: 'Concurrent User',
        hashedPassword,
        emailVerified: true,
        isActive: true
      });

      // Attempt multiple concurrent logins
      const promises = Array(5).fill(null).map(() =>
        testContext
          .request()
          .post('/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.attributes.tokens.accessToken).toBeDefined();
      });
    });

    it('should complete full OAuth signup and profile completion flow', async () => {
      // 1. Create OAuth user (simulating OAuth callback creating incomplete user)
      const oauthUser = await testContext.prisma.user.create({
        data: {
          email: 'oauth-integration@example.com',
          name: 'OAuth Integration User',
          avatar: 'https://example.com/avatar.jpg',
          emailVerified: true,
          isActive: true,
          profileComplete: false,
          authProvider: 'GOOGLE',
          organizationId: null,
        },
      });

      // 2. Generate token (simulating OAuth callback)
      const { JwtService } = await import('@nestjs/jwt');
      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET || 'test-secret',
        signOptions: { expiresIn: '1h' },
      });

      const initialToken = jwtService.sign({
        email: oauthUser.email,
        sub: oauthUser.id,
        organizationId: null,
      });

      // 3. Attempt to access protected endpoint (should work even with incomplete profile)
      const meResponse = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${initialToken}`)
        .expect(200);

      expect(meResponse.body.data.attributes.profileComplete).toBe(false);
      expect(meResponse.body.data.attributes.organizationId).toBeNull();

      // 4. Complete profile
      const completeResponse = await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${initialToken}`)
        .send({
          organizationName: 'OAuth Integration Org',
          organizationType: 'INTEGRATED_FARM',
          phone: '+1987654321',
        })
        .expect(200);

      expect(completeResponse.body.data.attributes.user.profileComplete).toBe(true);
      expect(completeResponse.body.data.attributes.user.organizationId).toBeTruthy();

      const { accessToken } = completeResponse.body.data.attributes.tokens;

      // 5. Verify updated token works and has complete profile
      const updatedMeResponse = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(updatedMeResponse.body.data.attributes.profileComplete).toBe(true);
      expect(updatedMeResponse.body.data.attributes.organization).toBeDefined();
      expect(updatedMeResponse.body.data.attributes.organization.name).toBe('OAuth Integration Org');

      // 6. Verify cannot complete profile again
      await testContext
        .request()
        .post('/auth/complete-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationName: 'Another Org',
          organizationType: 'FARM_OPERATION',
        })
        .expect(409);

      // 7. Verify user can logout
      await testContext
        .request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);
    });
  });
});
