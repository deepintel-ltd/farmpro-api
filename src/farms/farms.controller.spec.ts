import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FarmsController', () => {
  let controller: FarmsController;
  let service: jest.Mocked<FarmsService>;

  beforeEach(() => {
    // Create deep mock for FarmsService
    service = {
      getFarms: jest.fn(),
      getFarm: jest.fn(),
      createFarm: jest.fn(),
      updateFarm: jest.fn(),
      deleteFarm: jest.fn(),
      getFarmCommodities: jest.fn(),
    } as any;

    // Create controller instance with mocked dependencies
    controller = new FarmsController(service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have farms service', () => {
    expect(service).toBeDefined();
  });
});
