import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../prisma/supabase.service';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private logsService: LogsService,
  ) {}

  async findAll(
    params: {
      skip?: number;
      take?: number;
      search?: string;
      stockFilter?: string;
      role?: string;
    } = {},
  ) {
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
      purchaseUnit: true,
      supplier: true,
      markupPercent: true,
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
          location: { select: { id: true, name: true } },
        },
      },
    };

    const safeTake = Math.min(take ?? 20, 2000);
    const start = Date.now();

    try {
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
    } catch (error) {
      console.error('[ProductsService] findAll error:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        unit: true,
        purchaseUnit: true,
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
            location: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    return product;
  }


  async create(data: {
    sku: string;
    name: string;
    description?: string;
    supplier?: string;
    markupPercent?: number;
    unit?: string;
    purchaseUnit?: string;
    price?: number;
    threshold?: number;
    initialStock?: number;
    initialLocationId?: string;
    userId?: string;
  }) {
    const initialStock = data.initialStock ? Number(data.initialStock) : 0;
    const price = data.price ? Number(data.price) : 0;
    const threshold = data.threshold ? Number(data.threshold) : 0;

    // Auto-generate SKU if empty or missing
    let finalSku = data.sku;
    if (!finalSku || finalSku.trim() === '') {
      finalSku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const {
      initialLocationId,
      userId,
      initialStock: _,
      sku,
      ...productData
    } = data;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          sku: finalSku,
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

      await tx.activityLog.create({
        data: {
          userId: data.userId || 'system',
          productId: product.id,
          action: 'CREATE_PRODUCT',
          changes: { name: product.name, sku: product.sku },
        },
      });

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

    return this.prisma.$transaction(
      async (tx) => {
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
        const transaction = await tx.productTransaction.create({
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

        await this.logsService.create({
          userId,
          productId,
          action: `STOCK_${type}`,
          changes: { quantity, remarks, location: transaction.location.name },
        });

        return transaction;
      },
      { maxWait: 5000, timeout: 20000 },
    );
  }

  async bulkRelease(data: {
    sourceLocationId: string;
    requestedBy: string;
    whereTo: string;
    remarks: string;
    userId: string;
    items: { productId: string; quantity: number }[];
  }) {
    return this.prisma.$transaction(
      async (tx) => {
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

        await this.logsService.create({
          userId: data.userId,
          action: 'BULK_RELEASE',
          changes: {
            itemCount: data.items.length,
            whereTo: data.whereTo,
            requestedBy: data.requestedBy,
          },
        });

        return results;
      },
      { maxWait: 5000, timeout: 30000 },
    );
  }

  async findAllTransactions(
    params: { skip?: number; take?: number; search?: string } = {},
  ) {
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

    const safeTake = Math.min(take ? Number(take) : 20, 500);
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
          product: { select: { id: true, name: true, sku: true, unit: true, purchaseUnit: true, description: true } },
          location: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productTransaction.count({ where }),
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(
        `[ProductsService] Slow findAllTransactions query: ${duration}ms`,
      );
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

        await this.logsService.create({
          userId,
          productId,
          action: 'MANUAL_ADJUSTMENT',
          changes: { oldQty: currentQty, newQty: newTotalQuantity, remarks },
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

  async update(id: string, data: any, userId?: string) {
    // 1. Filter out only valid updatable fields of Product
    const {
      sku,
      name,
      description,
      supplier,
      markupPercent,
      price,
      threshold,
      unit,
      purchaseUnit,
      imageUrl,
      imageUrl2,
      showInInventory,
      totalStock,
    } = data;

    const updateData: any = {};
    if (sku !== undefined) updateData.sku = sku;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (markupPercent !== undefined) updateData.markupPercent = markupPercent !== null ? Number(markupPercent) : null;
    if (price !== undefined) updateData.price = Number(price);
    if (threshold !== undefined) updateData.threshold = Number(threshold);
    if (unit !== undefined) updateData.unit = unit;
    if (purchaseUnit !== undefined) updateData.purchaseUnit = purchaseUnit || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imageUrl2 !== undefined) updateData.imageUrl2 = imageUrl2;
    if (showInInventory !== undefined) {
      updateData.showInInventory = typeof showInInventory === 'boolean'
        ? showInInventory
        : showInInventory === 'true';
    }

    // 2. Perform database updates in a transaction
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: updateData,
      });

      // 3. Handle administrative stock bypass if totalStock is specified
      if (totalStock !== undefined) {
        const currentStocks = await tx.productStock.findMany({
          where: { productId: id },
        });

        const currentTotal = currentStocks.reduce((acc, s) => acc + s.quantity, 0);
        const diff = Number(totalStock) - currentTotal;

        if (diff !== 0) {
          if (currentStocks.length > 0) {
            // Apply correction to the primary (first) stock record
            const primaryStock = currentStocks[0];
            const newQty = primaryStock.quantity + diff;
            await tx.productStock.update({
              where: { id: primaryStock.id },
              data: { quantity: newQty >= 0 ? newQty : 0 },
            });
          } else {
            // No stock record exists yet, associate with the first location in database
            const firstLocation = await tx.location.findFirst();
            if (firstLocation) {
              await tx.productStock.create({
                data: {
                  productId: id,
                  locationId: firstLocation.id,
                  quantity: Number(totalStock) >= 0 ? Number(totalStock) : 0,
                },
              });
            }
          }
        }

        // Add totalStock changes metadata to changes log
        updateData.totalStock = Number(totalStock);
      }

      if (userId) {
        await this.logsService.create({
          userId,
          productId: id,
          action: 'UPDATE_PRODUCT',
          changes: updateData,
        });
      }

      return product;
    });
  }


  async remove(id: string, userId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    const result = await this.prisma.product.delete({
      where: { id },
    });

    if (userId && product) {
      await this.logsService.create({
        userId,
        action: 'DELETE_PRODUCT',
        changes: { name: product.name, sku: product.sku },
      });
    }

    return result;
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
