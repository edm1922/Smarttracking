import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: {
        stocks: {
          include: { location: true }
        }
      },
      orderBy: { name: 'asc' }
    });
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
        } 
      });

      if (initialStock > 0 && initialLocationId && userId) {
        await tx.productStock.create({
          data: {
            productId: product.id,
            locationId: initialLocationId,
            quantity: initialStock
          }
        });

        await tx.productTransaction.create({
          data: {
            productId: product.id,
            locationId: initialLocationId,
            userId,
            type: 'IN',
            quantity: initialStock,
            remarks: 'Initial Actual Stock'
          }
        });
      }

      return product;
    });
  }

  async processStock(productId: string, locationId: string, userId: string, type: 'IN' | 'OUT', quantity: number, remarks?: string) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update or Create ProductStock
      const existingStock = await tx.productStock.findUnique({
        where: { productId_locationId: { productId, locationId } }
      });

      if (type === 'OUT' && (!existingStock || existingStock.quantity < quantity)) {
        throw new BadRequestException('Insufficient stock at this location');
      }

      const newQuantity = type === 'IN' 
        ? (existingStock?.quantity || 0) + quantity 
        : (existingStock?.quantity || 0) - quantity;

      await tx.productStock.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, quantity: newQuantity },
        update: { quantity: newQuantity }
      });

      // 2. Create Transaction Log
      return tx.productTransaction.create({
        data: {
          productId,
          locationId,
          userId,
          type,
          quantity,
          remarks
        },
        include: { product: true, location: true }
      });
    });
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
          where: { productId_locationId: { productId: item.productId, locationId: data.sourceLocationId } }
        });

        if (!existingStock || existingStock.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for item ${item.productId}`);
        }

        // 2. Update stock
        const newQuantity = existingStock.quantity - item.quantity;
        await tx.productStock.update({
          where: { productId_locationId: { productId: item.productId, locationId: data.sourceLocationId } },
          data: { quantity: newQuantity }
        });

        // 3. Log transaction
        const log = await tx.productTransaction.create({
          data: {
            productId: item.productId,
            locationId: data.sourceLocationId,
            userId: data.userId,
            type: 'OUT',
            quantity: item.quantity,
            remarks: `Bulk Release: ${data.remarks} | To: ${data.whereTo} | Req by: ${data.requestedBy}`
          }
        });
        results.push(log);
      }
      return results;
    });
  }

  getTransactionLogs() {
    return this.prisma.productTransaction.findMany({
      include: {
        product: true,
        location: true,
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async manualStockAdjustment(productId: string, locationId: string, userId: string, newTotalQuantity: number, remarks: string = 'Manual Stock Adjustment') {
    return this.prisma.$transaction(async (tx) => {
      const existingStock = await tx.productStock.findUnique({
        where: { productId_locationId: { productId, locationId } }
      });

      const currentQty = existingStock?.quantity || 0;
      const diff = newTotalQuantity - currentQty;

      if (diff === 0) return existingStock;

      const type = diff > 0 ? 'IN' : 'OUT';
      const quantity = Math.abs(diff);

      // Update stock
      await tx.productStock.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, quantity: newTotalQuantity },
        update: { quantity: newTotalQuantity }
      });

      // Log transaction
      return tx.productTransaction.create({
        data: {
          productId,
          locationId,
          userId,
          type,
          quantity,
          remarks: `${remarks} (Previous: ${currentQty}, New: ${newTotalQuantity})`
        }
      });
    });
  }

  update(id: string, data: any) {
    // Ensure numbers are parsed correctly if they exist in update
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.threshold !== undefined) data.threshold = Number(data.threshold);
    
    return this.prisma.product.update({
      where: { id },
      data
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({
      where: { id }
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
        where: { productId_locationId: { productId: log.productId, locationId: log.locationId } }
      });

      if (stock) {
        const adjustment = log.type === 'IN' ? diff : -diff;
        const newQty = stock.quantity + adjustment;
        if (newQty < 0) throw new BadRequestException('Adjustment would result in negative stock');
        
        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: newQty }
        });
      }

      return tx.productTransaction.update({
        where: { id },
        data: { 
          quantity: Number(data.quantity), 
          remarks: data.remarks 
        },
        include: {
          product: true,
          location: true,
          user: { select: { username: true } }
        }
      });
    });
  }

  async removeLog(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.productTransaction.findUnique({ where: { id } });
      if (!log) throw new BadRequestException('Log not found');

      // Revert stock
      const stock = await tx.productStock.findUnique({
        where: { productId_locationId: { productId: log.productId, locationId: log.locationId } }
      });

      if (stock) {
        const adjustment = log.type === 'IN' ? -log.quantity : log.quantity;
        const newQty = stock.quantity + adjustment;
        if (newQty < 0) throw new BadRequestException('Deletion would result in negative stock');

        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: newQty }
        });
      }

      return tx.productTransaction.delete({ where: { id } });
    });
  }
}
