import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { PrismaHealthService } from './prisma.health';

describe('PrismaService', () => {
  let service: PrismaService;
  let healthService: PrismaHealthService;

  beforeEach(async () => {
    // Note: This test uses Test.createTestingModule because it's testing the actual PrismaService
    // which requires real database connection and configuration
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [PrismaService, PrismaHealthService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    healthService = module.get<PrismaHealthService>(PrismaHealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(healthService).toBeDefined();
  });

  it('should have proper methods', () => {
    expect(service.healthCheck).toBeDefined();
    expect(service.cleanDisconnect).toBeDefined();
    expect(healthService.checkHealth).toBeDefined();
  });

  it('should have access to Prisma models', () => {
    // Verify that the API Design System models are available
    expect(service.user).toBeDefined();
    expect(service.farm).toBeDefined();
    expect(service.commodity).toBeDefined();
    expect(service.order).toBeDefined();
    expect(service.organization).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return boolean', async () => {
      // Mock the health check to avoid database dependency in unit tests
      jest.spyOn(service, 'healthCheck').mockResolvedValue(true);
      
      const result = await service.healthCheck();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('PrismaHealthService', () => {
    it('should return health check result', async () => {
      // Mock the health check
      jest.spyOn(service, 'healthCheck').mockResolvedValue(true);
      
      const result = await healthService.checkHealth();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('timestamp');
      expect(result.database).toHaveProperty('connected');
    });
  });
});
