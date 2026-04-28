import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../prisma/supabase.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            productTransaction: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            uploadImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return paginated products', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: '1', name: 'Product 1' }]);
    prisma.product.count.mockResolvedValue(1);

    const res = await service.findAll({ skip: 0, take: 10 });

    expect(res.data.length).toBeLessThanOrEqual(10);
    expect(res.total).toBe(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 10,
    }));
  });

  it('should apply product search', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: '1', name: 'Search Result' }]);
    prisma.product.count.mockResolvedValue(1);

    const res = await service.findAll({ search: 'search' });

    expect(res.data[0].name).toBe('Search Result');
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({ name: expect.objectContaining({ contains: 'search' }) })
        ])
      })
    }));
  });

  it('should return paginated transactions', async () => {
    prisma.productTransaction.findMany.mockResolvedValue([{ id: 'log1', type: 'IN' }]);
    prisma.productTransaction.count.mockResolvedValue(1);

    const res = await service.findAllTransactions({ skip: 0, take: 5 });

    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
    expect(prisma.productTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 5,
    }));
  });
});
