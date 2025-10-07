import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Currency } from '@prisma/client';
import * as request from 'supertest';

describe('Executive Dashboard (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let organizationId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test organization and user
    const organization = await prismaService.organization.create({
      data: {
        name: 'Test Organization',
        type: 'FARM_OPERATION',
        email: 'test@example.com',
        currency: Currency.USD,
      },
    });
    organizationId = organization.id;

    const user = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        organizationId: organizationId,
        hashedPassword: 'hashed-password',
      },
    });
    userId = user.id;

    // Create auth token
    authToken = jwtService.sign({
      sub: userId,
      email: 'test@example.com',
      organizationId: organizationId,
    });

    // Create some test transactions
    await prismaService.transaction.createMany({
      data: [
        {
          organizationId: organizationId,
          type: 'FARM_REVENUE',
          amount: 10000,
          currency: Currency.USD,
          status: 'COMPLETED',
          description: 'Test revenue transaction',
          createdById: userId,
        },
        {
          organizationId: organizationId,
          type: 'FARM_EXPENSE',
          amount: 6000,
          currency: Currency.USD,
          status: 'COMPLETED',
          description: 'Test expense transaction',
          createdById: userId,
        },
        {
          organizationId: organizationId,
          type: 'FARM_REVENUE',
          amount: 5000,
          currency: Currency.USD,
          status: 'PENDING',
          description: 'Pending revenue transaction',
          requiresApproval: true,
          createdById: userId,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.transaction.deleteMany({
      where: { organizationId: organizationId },
    });
    await prismaService.user.deleteMany({
      where: { organizationId: organizationId },
    });
    await prismaService.organization.deleteMany({
      where: { id: organizationId },
    });
    await app.close();
  });

  describe('/organizations/executive-dashboard (GET)', () => {
    it('should return executive dashboard data', () => {
      return request(app.getHttpServer())
        .get('/organizations/executive-dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'month',
          currency: 'USD',
          includeInsights: true,
          includeProjections: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.type).toBe('executive-dashboard');
          expect(res.body.data.id).toBe(organizationId);
          expect(res.body.data.attributes).toBeDefined();
          expect(res.body.data.attributes.financialHealth).toBeDefined();
          expect(res.body.data.attributes.riskIndicators).toBeDefined();
          expect(res.body.data.attributes.cashFlow).toBeDefined();
          expect(res.body.data.attributes.keyMetrics).toBeDefined();
          expect(res.body.data.attributes.pendingActions).toBeDefined();
          expect(res.body.data.attributes.insights).toBeDefined();
        });
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .get('/organizations/executive-dashboard')
        .expect(401);
    });
  });

  describe('/organizations/financial-health (GET)', () => {
    it('should return financial health data', () => {
      return request(app.getHttpServer())
        .get('/organizations/financial-health')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'month',
          currency: 'USD',
          includeBreakdown: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.type).toBe('financial-health');
          expect(res.body.data.id).toBe(organizationId);
          expect(res.body.data.attributes).toBeDefined();
          expect(res.body.data.attributes.score).toBeDefined();
          expect(res.body.data.attributes.grade).toBeDefined();
          expect(res.body.data.attributes.factors).toBeDefined();
          expect(res.body.data.attributes.recommendations).toBeDefined();
        });
    });
  });

  describe('/organizations/risk-indicators (GET)', () => {
    it('should return risk indicators data', () => {
      return request(app.getHttpServer())
        .get('/organizations/risk-indicators')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          currency: 'USD',
          includeAlerts: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.type).toBe('risk-indicators');
          expect(res.body.data.id).toBe(organizationId);
          expect(res.body.data.attributes).toBeDefined();
          expect(res.body.data.attributes.overallRisk).toBeDefined();
          expect(res.body.data.attributes.indicators).toBeDefined();
          expect(res.body.data.attributes.alerts).toBeDefined();
        });
    });
  });

  describe('/organizations/cash-flow (GET)', () => {
    it('should return cash flow analysis data', () => {
      return request(app.getHttpServer())
        .get('/organizations/cash-flow')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'month',
          currency: 'USD',
          includeProjections: true,
          projectionMonths: 6,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.type).toBe('cash-flow');
          expect(res.body.data.id).toBe(organizationId);
          expect(res.body.data.attributes).toBeDefined();
          expect(res.body.data.attributes.currentCashFlow).toBeDefined();
          expect(res.body.data.attributes.projectedCashFlow).toBeDefined();
          expect(res.body.data.attributes.breakdown).toBeDefined();
          expect(res.body.data.attributes.burnRate).toBeDefined();
          expect(res.body.data.attributes.runway).toBeDefined();
        });
    });
  });

  describe('/organizations/pending-actions (GET)', () => {
    it('should return pending actions data', () => {
      return request(app.getHttpServer())
        .get('/organizations/pending-actions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          limit: 10,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.total).toBeDefined();
          expect(res.body.meta.page).toBeDefined();
          expect(res.body.meta.limit).toBeDefined();
        });
    });
  });

  describe('/organizations/executive-insights (GET)', () => {
    it('should return executive insights data', () => {
      return request(app.getHttpServer())
        .get('/organizations/executive-insights')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          limit: 10,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.total).toBeDefined();
          expect(res.body.meta.page).toBeDefined();
          expect(res.body.meta.limit).toBeDefined();
        });
    });
  });
});
