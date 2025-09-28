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
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;
    let accessToken: string;

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
        });

      refreshToken = loginResponse.body.data.attributes.tokens.refreshToken;
      accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await testContext
        .request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.type).toBe('auth');
      expect(response.body.data.attributes.tokens.accessToken).toBeDefined();
      expect(response.body.data.attributes.tokens.refreshToken).toBeDefined();
      expect(response.body.data.attributes.tokens.accessToken).not.toBe(accessToken);
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
        });

      accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      await testContext
        .request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
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
        });

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

      expect(response.body.data.type).toBe('message');
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
        .expect(400);
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

      const newAccessToken = refreshResponse.body.data.attributes.tokens.accessToken;

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
  });
});
