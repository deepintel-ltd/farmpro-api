import { Test, TestingModule } from '@nestjs/testing';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FarmsController', () => {
  let controller: FarmsController;
  let service: FarmsService;

  const mockFarmsService = {
    getFarms: jest.fn(),
    getFarm: jest.fn(),
    createFarm: jest.fn(),
    updateFarm: jest.fn(),
    deleteFarm: jest.fn(),
    getFarmCommodities: jest.fn(),
  };

  const mockPrismaService = {
    farm: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    commodity: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FarmsController],
      providers: [
        {
          provide: FarmsService,
          useValue: mockFarmsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<FarmsController>(FarmsController);
    service = module.get<FarmsService>(FarmsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have farms service', () => {
    expect(service).toBeDefined();
  });
});
