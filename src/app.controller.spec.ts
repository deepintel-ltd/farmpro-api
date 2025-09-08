import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthCheckSchema } from '@contracts/schemas';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "FarmPro API is running!"', () => {
      expect(appController.getHello()).toBe('FarmPro API is running!');
    });
  });

  describe('health', () => {
    it('should return valid health check response', () => {
      const result = appController.getHealth();
      
      // Test that the schema validation works
      expect(() => HealthCheckSchema.parse(result)).not.toThrow();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('farmpro-api');
      expect(result.timestamp).toBeDefined();
    });
  });
});
