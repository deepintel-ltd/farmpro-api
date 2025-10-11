import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

describe('Organization Impersonation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let platformAdminToken: string;
  let regularUserToken: string;
  let testOrganizationId: string;
  let targetOrganizationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create platform admin user
    const platformAdmin = await prisma.user.create({
      data: {
        email: 'platform-admin@test.com',
        firstName: 'Platform',
        lastName: 'Admin',
        isPlatformAdmin: true,
        isActive: true,
        profileComplete: true,
        organizationId: null, // Platform admins don't need organization
      },
    });

    // Create test organization
    const testOrg = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        type: 'FARM',
        plan: 'BASIC',
        isActive: true,
        isVerified: true,
      },
    });
    testOrganizationId = testOrg.id;

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'regular@test.com',
        firstName: 'Regular',
        lastName: 'User',
        isPlatformAdmin: false,
        isActive: true,
        profileComplete: true,
        organizationId: testOrg.id,
      },
    });

    // Create target organization for impersonation
    const targetOrg = await prisma.organization.create({
      data: {
        name: 'Target Organization',
        type: 'FARM',
        plan: 'PRO',
        isActive: true,
        isVerified: true,
      },
    });
    targetOrganizationId = targetOrg.id;

    // Generate tokens (simplified for testing)
    platformAdminToken = `test-token-${platformAdmin.id}`;
    regularUserToken = `test-token-${regularUser.id}`;
  }

  async function cleanupTestData() {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['platform-admin@test.com', 'regular@test.com'],
        },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        id: {
          in: [testOrganizationId, targetOrganizationId],
        },
      },
    });
  }

  describe('Platform Admin Impersonation', () => {
    it('should allow platform admin to impersonate organization', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .set('X-Organization-Id', targetOrganizationId)
        .expect(200);

      // Check that impersonation headers are set
      expect(response.headers['x-impersonated-organization']).toBe(targetOrganizationId);
      expect(response.headers['x-impersonated-organization-name']).toBe('Target Organization');
    });

    it('should reject impersonation of non-existent organization', async () => {
      await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .set('X-Organization-Id', 'non-existent-org-id')
        .expect(401);
    });

    it('should reject impersonation of inactive organization', async () => {
      // Create inactive organization
      const inactiveOrg = await prisma.organization.create({
        data: {
          name: 'Inactive Organization',
          type: 'FARM',
          plan: 'BASIC',
          isActive: false,
          isVerified: true,
        },
      });

      await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .set('X-Organization-Id', inactiveOrg.id)
        .expect(401);

      // Cleanup
      await prisma.organization.delete({ where: { id: inactiveOrg.id } });
    });
  });

  describe('Regular User Restrictions', () => {
    it('should reject regular user using X-Organization-Id header', async () => {
      await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .set('X-Organization-Id', targetOrganizationId)
        .expect(403);
    });

    it('should allow regular user without X-Organization-Id header', async () => {
      await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);
    });
  });

  describe('Organization Context', () => {
    it('should use user organization when no header provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      // Should not have impersonation headers
      expect(response.headers['x-impersonated-organization']).toBeUndefined();
      expect(response.headers['x-impersonated-organization-name']).toBeUndefined();
    });
  });
});
