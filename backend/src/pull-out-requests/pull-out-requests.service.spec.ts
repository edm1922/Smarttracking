import { Test, TestingModule } from '@nestjs/testing';
import { PullOutRequestsService } from './pull-out-requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';

describe('PullOutRequestsService', () => {
  let service: PullOutRequestsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PullOutRequestsService,
        {
          provide: PrismaService,
          useValue: {
            pullOutRequest: {
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            staffActivity: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: ItemsService,
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PullOutRequestsService>(PullOutRequestsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return paginated requests for a user', async () => {
    prisma.pullOutRequest.findMany.mockResolvedValue([{ id: 'req1', qty: 5 }]);
    prisma.pullOutRequest.count.mockResolvedValue(1);

    const res = await service.findByUser('user1', { skip: 0, take: 10 });

    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
    expect(prisma.pullOutRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 10,
      where: expect.objectContaining({ userId: 'user1' })
    }));
  });

  it('should return paginated pending requests for admin', async () => {
    prisma.pullOutRequest.findMany.mockResolvedValue([{ id: 'req2', status: 'SUBMITTED' }]);
    prisma.pullOutRequest.count.mockResolvedValue(1);

    const res = await service.findAllPending({ skip: 0, take: 5 });

    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
    expect(prisma.pullOutRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 5,
      where: expect.objectContaining({ status: 'SUBMITTED' })
    }));
  });
});
