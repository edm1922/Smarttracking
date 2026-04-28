import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from './logs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LogsService', () => {
  let service: LogsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        {
          provide: PrismaService,
          useValue: {
            activityLog: {
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return paginated logs for an item', async () => {
    prisma.activityLog.findMany.mockResolvedValue([{ id: 'log1', action: 'CREATE' }]);
    prisma.activityLog.count.mockResolvedValue(1);

    const res = await service.findByItem('item1', { skip: 0, take: 10 });

    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 10,
      where: expect.objectContaining({ itemId: 'item1' })
    }));
  });

  it('should return paginated logs for all items', async () => {
    prisma.activityLog.findMany.mockResolvedValue([{ id: 'log2', action: 'UPDATE' }]);
    prisma.activityLog.count.mockResolvedValue(1);

    const res = await service.findAll({ skip: 0, take: 5 });

    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 5,
    }));
  });
});
