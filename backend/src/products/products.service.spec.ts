import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../prisma/supabase.service';
import { LogsService } from '../logs/logs.service';
import { BadRequestException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let prismaClientMock: any;

  beforeEach(async () => {
    prismaClientMock = {
      product: {
        update: jest.fn(),
      },
      productStock: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      location: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            productTransaction: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation(async (callback) => {
              return callback(prismaClientMock);
            }),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            uploadImage: jest.fn(),
          },
        },
        {
          provide: LogsService,
          useValue: {
            create: jest.fn(),
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
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      }),
    );
  });

  it('should apply product search', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: '1', name: 'Search Result' },
    ]);
    prisma.product.count.mockResolvedValue(1);

    const res = await service.findAll({ search: 'search' });

    expect(res.data[0].name).toBe('Search Result');
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              name: expect.objectContaining({ contains: 'search' }),
            }),
          ]),
        }),
      }),
    );
  });

  it('should return paginated transactions', async () => {
    prisma.productTransaction.findMany.mockResolvedValue([
      { id: 'log1', type: 'IN' },
    ]);
    prisma.productTransaction.count.mockResolvedValue(1);

    const res = await service.findAllTransactions({ skip: 0, take: 5 });

    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
    expect(prisma.productTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 5,
      }),
    );
  });

  describe('findOne', () => {
    it('should return product if it exists', async () => {
      const mockProduct = { id: 'prod1', name: 'Product 1', stocks: [] };
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      const res = await service.findOne('prod1');

      expect(res).toEqual(mockProduct);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod1' },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update valid product fields and ignore invalid fields', async () => {
      const mockUpdatedProduct = { id: 'prod1', name: 'New Name' };
      prismaClientMock.product.update.mockResolvedValue(mockUpdatedProduct);

      const res = await service.update('prod1', {
        name: 'New Name',
        invalidField: 'ignored',
        stocks: [{ locationId: 'loc1', quantity: 10 }],
      }, 'user1');

      expect(res).toEqual(mockUpdatedProduct);
      expect(prismaClientMock.product.update).toHaveBeenCalledWith({
        where: { id: 'prod1' },
        data: {
          name: 'New Name',
        },
      });
    });

    it('should adjust stock during administrative bypass if totalStock increases', async () => {
      prismaClientMock.product.update.mockResolvedValue({ id: 'prod1' });
      prismaClientMock.productStock.findMany.mockResolvedValue([
        { id: 'stock1', productId: 'prod1', locationId: 'loc1', quantity: 5 },
      ]);

      await service.update('prod1', {
        totalStock: 12,
      }, 'user1');

      expect(prismaClientMock.productStock.update).toHaveBeenCalledWith({
        where: { id: 'stock1' },
        data: { quantity: 12 },
      });
    });

    it('should create stock record if no stocks exist during bypass', async () => {
      prismaClientMock.product.update.mockResolvedValue({ id: 'prod1' });
      prismaClientMock.productStock.findMany.mockResolvedValue([]);
      prismaClientMock.location.findFirst.mockResolvedValue({ id: 'loc1' });

      await service.update('prod1', {
        totalStock: 8,
      }, 'user1');

      expect(prismaClientMock.productStock.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod1',
          locationId: 'loc1',
          quantity: 8,
        },
      });
    });
  });
});
