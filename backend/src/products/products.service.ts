import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../prisma/supabase.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService
  ) {}

  async findAll(params: { skip?: number; take?: number; search?: string; stockFilter?: string; role?: string } = {}) {
    const { skip = 0, take = 20, search, stockFilter, role } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role !== 'admin') {
      where.showInInventory = true;
    }

    const select = {
      id: true,
      sku: true,
      name: true,
      description: true,
      unit: true,
      price: true,
      threshold: true,
      imageUrl: true,
      imageUrl2: true,
      showInInventory: true,
      createdAt: true,
      stocks: {
        select: {
          locationId: true,
          quantity: true,
          location: { select: { id: true, name: true } }
        },
      },
    };

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    if (stockFilter && stockFilter !== 'all') {
      // O(1) OPTIMIZATION: Use database aggregation with HAVING clause
      // Push filtering to DB level instead of loading all products into memory
      
      // Build the base query with stock aggregation
      const stockFilterSql = {
        restock: Prisma.sql`HAVING COALESCE(SUM(ps."quantity"), 0) < p."threshold"`,
        low: Prisma.sql`HAVING COALESCE(SUM(ps."quantity"), 0) = p."threshold"`,
        high: Prisma.sql`HAVING COALESCE(SUM(ps."quantity"), 0) > p."threshold"`,
      };

      const havingClause = stockFilterSql[stockFilter as keyof typeof stockFilterSql];
      if (!havingClause) {
        // Invalid filter, use normal query
        const [data, total] = await Promise.all([
          this.prisma.product.findMany({ where, skip, take: safeTake, select, orderBy: { name: 'asc' } }),
          this.prisma.product.count({ where }),
        ]);
        return { data, total };
      }

      // Use raw query with proper aggregation
      const searchCondition = search 
        ? Prisma.sql`AND (p.name ILIKE ${'%' + search + '%'} OR p.sku ILIKE ${'%' + search + '%'})`
        : Prisma.empty;
      const roleCondition = role !== 'admin' ? Prisma.sql`AND p."showInInventory" = true` : Prisma.empty;

      const result = await this.prisma.$queryRaw<Array<any>>`
        SELECT p.id, p.sku, p.name, p.description, p.unit, p.price, p.threshold, 
               p."imageUrl", p."imageUrl2", p."showInInventory", p."createdAt",
               COALESCE(SUM(ps."quantity"), 0)::int as "totalStock"
        FROM "Product" p
        LEFT JOIN "ProductStock" ps ON p.id = ps."productId"
        WHERE 1=1 ${searchCondition} ${roleCondition}
        GROUP BY p.id, p.sku, p.name, p.description, p.unit, p.price, p.threshold, 
                 p."imageUrl", p."imageUrl2", p."showInInventory", p."createdAt"
        ${havingClause}
        ORDER BY p.name ASC
        LIMIT ${safeTake} OFFSET ${skip}
      `;

      const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM (
          SELECT p.id
          FROM "Product" p
          LEFT JOIN "ProductStock" ps ON p.id = ps."productId"
          WHERE 1=1 ${searchCondition} ${roleCondition}
          GROUP BY p.id
          ${havingClause}
        ) sub
      `;

      const duration = Date.now() - start;
      if (duration > 300) {
        console.warn(`[ProductsService] Slow findAll (StockFilter) query: ${duration}ms`);
      }

      const data = result.map((p) => ({
        ...p,
        stocks: [{ quantity: p.totalStock, locationId: null, location: null }],
      }));

      return { data, total: Number(totalResult[0]?.count || 0) };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: safeTake,
        select,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[ProductsService] Slow findAll query: ${duration}ms`);
    }

    return { data, total };
  }

  async create(data: {
    sku: string;
    name: string;
    description?: string;
    unit?: string;
    price?: number;
    threshold?: number;
    initialStock?: number;
    initialLocationId?: string;
    userId?: string;
  }) {
    const initialStock = data.initialStock ? Number(data.initialStock) : 0;
    const price = data.price ? Number(data.price) : 0;
    const threshold = data.threshold ? Number(data.threshold) : 0;
    const { initialLocationId, userId, initialStock: _, ...productData } = data;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          price,
          threshold,
        },
      });

      if (initialStock > 0 && initialLocationId && userId) {
        await tx.productStock.create({
          data: {
            productId: product.id,
            locationId: initialLocationId,
            quantity: initialStock,
          },
        });

        await tx.productTransaction.create({
          data: {
            productId: product.id,
            locationId: initialLocationId,
            userId,
            type: 'IN',
            quantity: initialStock,
            remarks: 'Initial Actual Stock',
          },
        });
      }

      return product;
    });
  }

  async processStock(
    productId: string,
    locationId: string,
    userId: string,
    type: 'IN' | 'OUT',
    quantity: number,
    remarks?: string,
  ) {
    if (quantity <= 0)
      throw new BadRequestException('Quantity must be greater than zero');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update or Create ProductStock
      const existingStock = await tx.productStock.findUnique({
        where: { productId_locationId: { productId, locationId } },
      });

      if (
        type === 'OUT' &&
        (!existingStock || existingStock.quantity < quantity)
      ) {
        throw new BadRequestException('Insufficient stock at this location');
      }

      const newQuantity =
        type === 'IN'
          ? (existingStock?.quantity || 0) + quantity
          : (existingStock?.quantity || 0) - quantity;

      await tx.productStock.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, quantity: newQuantity },
        update: { quantity: newQuantity },
      });

      // 2. Create Transaction Log
      return tx.productTransaction.create({
        data: {
          productId,
          locationId,
          userId,
          type,
          quantity,
          remarks,
        },
        include: { product: true, location: true },
      });
    }, { maxWait: 5000, timeout: 20000 });
  }

  async bulkRelease(data: {
    sourceLocationId: string;
    requestedBy: string;
    whereTo: string;
    remarks: string;
    userId: string;
    items: { productId: string; quantity: number }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of data.items) {
        // 1. Check stock
        const existingStock = await tx.productStock.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: data.sourceLocationId,
            },
          },
        });

        if (!existingStock || existingStock.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for item ${item.productId}`,
          );
        }

        // 2. Update stock
        const newQuantity = existingStock.quantity - item.quantity;
        await tx.productStock.update({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: data.sourceLocationId,
            },
          },
          data: { quantity: newQuantity },
        });

        // 3. Log transaction
        const log = await tx.productTransaction.create({
          data: {
            productId: item.productId,
            locationId: data.sourceLocationId,
            userId: data.userId,
            type: 'OUT',
            quantity: item.quantity,
            remarks: `Bulk Release: ${data.remarks} | To: ${data.whereTo} | Req by: ${data.requestedBy}`,
          },
        });
        results.push(log);
      }
      return results;
    }, { maxWait: 5000, timeout: 30000 });
  }

  async findAllTransactions(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 20, search } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { remarks: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
        { location: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    const [data, total] = await Promise.all([
      this.prisma.productTransaction.findMany({
        where,
        skip,
        take: safeTake,
        select: {
          id: true,
          type: true,
          quantity: true,
          remarks: true,
          createdAt: true,
          productId: true,
          locationId: true,
          product: { select: { id: true, name: true, sku: true } },
          location: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productTransaction.count({ where }),
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[ProductsService] Slow findAllTransactions query: ${duration}ms`);
    }

    return { data, total };
  }

  async manualStockAdjustment(
    productId: string,
    locationId: string,
    userId: string,
    newTotalQuantity: number,
    remarks: string = 'Manual Stock Adjustment',
    skipLog: boolean = false,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingStock = await tx.productStock.findUnique({
        where: { productId_locationId: { productId, locationId } },
      });

      const currentQty = existingStock?.quantity || 0;
      const diff = newTotalQuantity - currentQty;

      if (diff === 0) return existingStock;

      const type = diff > 0 ? 'IN' : 'OUT';
      const quantity = Math.abs(diff);

      // Update stock
      const result = await tx.productStock.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, quantity: newTotalQuantity },
        update: { quantity: newTotalQuantity },
      });

      // Log transaction ONLY if skipLog is false
      if (!skipLog) {
        await tx.productTransaction.create({
          data: {
            productId,
            locationId,
            userId,
            type,
            quantity,
            remarks: `${remarks} (Previous: ${currentQty}, New: ${newTotalQuantity})`,
          },
        });
      }

      return result;
    });
  }

  async uploadImage(id: string, file: any, slot: number = 1) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new BadRequestException('Product not found');

    const fileName = `prod-${id}-${slot}-${Date.now()}`;
    const imageUrl = await this.supabaseService.uploadImage(file, fileName);

    const updateData: any = {};
    if (slot === 2) {
      updateData.imageUrl2 = imageUrl;
    } else {
      updateData.imageUrl = imageUrl;
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  update(id: string, data: any) {
    // Ensure numbers are parsed correctly if they exist in update
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.threshold !== undefined) data.threshold = Number(data.threshold);

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  async updateLog(id: string, data: { quantity: number; remarks?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.productTransaction.findUnique({ where: { id } });
      if (!log) throw new BadRequestException('Log not found');

      const diff = Number(data.quantity) - log.quantity;
      if (diff === 0 && data.remarks === log.remarks) return log;

      // Adjust stock based on the difference
      const stock = await tx.productStock.findUnique({
        where: {
          productId_locationId: {
            productId: log.productId,
            locationId: log.locationId,
          },
        },
      });

      if (stock) {
        const adjustment = log.type === 'IN' ? diff : -diff;
        const newQty = stock.quantity + adjustment;
        if (newQty < 0)
          throw new BadRequestException(
            'Adjustment would result in negative stock',
          );

        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: newQty },
        });
      }

      return tx.productTransaction.update({
        where: { id },
        data: {
          quantity: Number(data.quantity),
          remarks: data.remarks,
        },
        include: {
          product: true,
          location: true,
          user: { select: { username: true } },
        },
      });
    });
  }

  async removeLog(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.productTransaction.findUnique({ where: { id } });
      if (!log) throw new BadRequestException('Log not found');

      // Revert stock
      const stock = await tx.productStock.findUnique({
        where: {
          productId_locationId: {
            productId: log.productId,
            locationId: log.locationId,
          },
        },
      });

      if (stock) {
        const adjustment = log.type === 'IN' ? -log.quantity : log.quantity;
        const newQty = stock.quantity + adjustment;
        if (newQty < 0)
          throw new BadRequestException(
            'Deletion would result in negative stock',
          );

        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: newQty },
        });
      }

      return tx.productTransaction.delete({ where: { id } });
    });
  }
}
