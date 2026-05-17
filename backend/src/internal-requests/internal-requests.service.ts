import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../prisma/supabase.service';

@Injectable()
export class InternalRequestsService {
  private cachedAdminId: string | null = null;
  
  // O(1) OPTIMIZATION: Cache for issuance counts
  private issuanceCache: Map<string, number> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute
  
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async create(data: any) {
    // Generate a unique request number with timestamp and random component to avoid collisions
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const requestNo = `REQ-${new Date().getFullYear()}-${timestamp}-${random}`;

    return this.prisma.internalRequest.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
        requestNo,
      },
      include: {
        product: true,
        location: true,
        targetLocation: true,
      },
    });
  }

  async bulkCreate(requestsData: any[]) {
    const currentYear = new Date().getFullYear();
    const batchId = Date.now().toString().slice(-4);
    
    const formattedData = requestsData.map((data, index) => {
      // Use a combination of timestamp, index, and random to guarantee uniqueness in bulk
      const random = Math.random().toString(36).substring(2, 4).toUpperCase();
      const requestNo = `REQ-${currentYear}-${batchId}${index.toString().padStart(2, '0')}-${random}`;
      
      return {
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
        requestNo,
        // Ensure additionalImages is handled if it's an array
        additionalImages: data.additionalImages || [],
      };
    });

    return this.prisma.internalRequest.createMany({
      data: formattedData,
    });
  }

  async uploadAttachment(file: any) {
    if (!file) throw new BadRequestException('No file provided');
    const fileName = `req-attach-${Date.now()}`;
    const url = await this.supabaseService.uploadImage(file, fileName);
    return { url };
  }

  async findAll(params: { skip?: number; take?: number; search?: string; status?: string } = {}) {
    const { skip = 0, take = 20, search, status } = params;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { requestNo: { contains: search, mode: 'insensitive' } },
        { employeeName: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    const [requests, total] = await Promise.all([
      this.prisma.internalRequest.findMany({
        where,
        skip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, description: true },
          },
          location: {
            select: { id: true, name: true },
          },
          targetLocation: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.internalRequest.count({ where }),
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[InternalRequestsService] Slow findAll query: ${duration}ms`);
    }

    // O(1) OPTIMIZATION: Use cached issuance counts with periodic refresh
    const now = Date.now();
    if (!this.issuanceCache || now - this.cacheTimestamp > this.CACHE_TTL) {
      const issuanceGroups = await this.prisma.internalRequest.groupBy({
        by: ['employeeName', 'date'],
        where: { status: 'FULFILLED' },
      });

      this.issuanceCache = new Map();
      issuanceGroups.forEach((i) => {
        const count = this.issuanceCache!.get(i.employeeName) || 0;
        this.issuanceCache!.set(i.employeeName, count + 1);
      });
      this.cacheTimestamp = now;
    }

    const data = requests.map((req) => {
      let count = (this.issuanceCache as any).get(req.employeeName) ?? 0;
      
      // If this specific request is already FULFILLED, it's included in the count.
      // We subtract 1 to get the number of PREVIOUS issuances.
      if (req.status === 'FULFILLED' && count > 0) {
        count--;
      }

      return {
        ...req,
        previousIssuancesCount: count,
      };
    });

    return { data, total };
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    remarks?: string,
    txOverride?: any,
  ) {
    const p = txOverride || this.prisma;
    const request = await p.internalRequest.findUnique({
      where: { id },
      include: { product: true, location: true, targetLocation: true },
    });

    if (!request) throw new NotFoundException('Request not found');

    let validUserId = userId;
    if (userId === 'admin-system' || userId === 'system-delete') {
      if (this.cachedAdminId) {
        validUserId = this.cachedAdminId;
      } else {
        const admin = await this.prisma.user.findFirst({ where: { role: 'admin' } });
        if (admin) {
          validUserId = admin.id;
          this.cachedAdminId = admin.id;
        } else {
          const anyUser = await this.prisma.user.findFirst();
          if (anyUser) validUserId = anyUser.id;
        }
      }
    }

    // Logic for fulfillment
    if (status === 'FULFILLED' && request.status !== 'FULFILLED') {
      // 1. Check stock
      const stock = await p.productStock.findUnique({
        where: {
          productId_locationId: {
            productId: request.productId,
            locationId: request.locationId,
          },
        },
      });

      if (!stock || stock.quantity < request.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${request.product.name} in ${request.location.name}`,
        );
      }

      const fulfillLogic = async (tx: any) => {
        // Update stock
        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: request.quantity } },
        });

        // Create Issuance Log (Transaction OUT from Source)
        await tx.productTransaction.create({
          data: {
            productId: request.productId,
            locationId: request.locationId,
            quantity: request.quantity,
            type: 'OUT',
            remarks: `Fulfilled Internal Request ${request.requestNo}. ${request.targetLocationId ? `Transferred to ${request.targetLocation?.name}` : `Issued to ${request.employeeName}`}`,
            userId: validUserId,
          },
        });

        // Handle Target Location (Stock IN)
        if (request.targetLocationId) {
          await tx.productStock.upsert({
            where: {
              productId_locationId: {
                productId: request.productId,
                locationId: request.targetLocationId,
              },
            },
            create: {
              productId: request.productId,
              locationId: request.targetLocationId,
              quantity: request.quantity,
            },
            update: {
              quantity: { increment: request.quantity },
            },
          });

          // Create Transaction IN for Target
          await tx.productTransaction.create({
            data: {
              productId: request.productId,
              locationId: request.targetLocationId,
              quantity: request.quantity,
              type: 'IN',
              remarks: `Received via Transfer from ${request.location.name} (Req ${request.requestNo})`,
              userId: validUserId,
            },
          });
        }

        // Update request status
        return tx.internalRequest.update({
          where: { id },
          data: { status, remarks },
        });
      };

      if (txOverride) {
        return fulfillLogic(txOverride);
      } else {
        return this.prisma.$transaction(async (tx) => fulfillLogic(tx), { timeout: 15000 });
      }
    }

    // Logic for UNDO fulfillment (Moving from FULFILLED to PENDING/APPROVED)
    if (request.status === 'FULFILLED' && status !== 'FULFILLED') {
      const undoLogic = async (tx: any) => {
        // 1. Revert Stock
        await tx.productStock.update({
          where: {
            productId_locationId: {
              productId: request.productId,
              locationId: request.locationId,
            },
          },
          data: { quantity: { increment: request.quantity } },
        });

        // 2. Create Reversal Log
        await tx.productTransaction.create({
          data: {
            productId: request.productId,
            locationId: request.locationId,
            quantity: request.quantity,
            type: 'IN',
            remarks: `REVERSED Internal Request ${request.requestNo}. Returned by ${request.employeeName}`,
            userId: validUserId,
          },
        });

        // 3. Handle Target Location Reversal (Stock OUT)
        if (request.targetLocationId) {
          await tx.productStock.update({
            where: {
              productId_locationId: {
                productId: request.productId,
                locationId: request.targetLocationId,
              },
            },
            data: { quantity: { decrement: request.quantity } },
          });

          // Create Transaction OUT for Target
          await tx.productTransaction.create({
            data: {
              productId: request.productId,
              locationId: request.targetLocationId,
              quantity: request.quantity,
              type: 'OUT',
              remarks: `Transfer REVERSED (Req ${request.requestNo})`,
              userId: validUserId,
            },
          });
        }

        // 4. Update status
        return tx.internalRequest.update({
          where: { id },
          data: { status, remarks: remarks || 'Fulfillment reversed' },
        });
      };

      if (txOverride) {
        return undoLogic(txOverride);
      } else {
        return this.prisma.$transaction(async (tx) => undoLogic(tx), { timeout: 15000 });
      }
    }

    return this.prisma.internalRequest.update({
      where: { id },
      data: { status, remarks },
    });
  }

  async bulkUpdateStatus(
    ids: string[],
    status: string,
    userId: string,
    remarks?: string,
  ) {
    if (status === 'FULFILLED') {
      // Parallel processing (Promise.all) overwhelmed the connection pool.
      // We must process these SEQUENTIALLY to prevent P2028 errors.
      const results = [];
      const errors = [];
      for (const id of ids) {
        try {
          const res = await this.updateStatus(id, status, userId, remarks);
          results.push(res);
        } catch (err) {
          errors.push(err.message);
        }
      }
      if (errors.length > 0) {
        throw new BadRequestException(`Failed to fulfill some items:\n${errors.join('\n')}`);
      }
      return results;
    }

    // For other statuses (APPROVED, REJECTED), we can do a simple updateMany
    return this.prisma.internalRequest.updateMany({
      where: { id: { in: ids } },
      data: { status, remarks },
    });
  }

  async remove(id: string, txOverride?: any) {
    const p = txOverride || this.prisma;
    const request = await p.internalRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Request not found');

    // If it was fulfilled, revert stock first
    if (request.status === 'FULFILLED') {
      await this.updateStatus(id, 'PENDING', 'system-delete', undefined, txOverride);
    }

    return p.internalRequest.delete({ where: { id } });
  }

  async bulkRemove(ids: string[]) {
    const results = [];
    for (const id of ids) {
      try {
        await this.remove(id);
        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, error: true, message: err.message });
      }
    }
    return results;
  }

  async getUniqueEmployees() {
    try {
      const allRequests = await this.prisma.internalRequest.findMany({
        select: { employeeName: true, employeeRole: true },
        orderBy: { employeeName: 'asc' },
      });
      
      // Manual distinct in memory
      const seen = new Set();
      const uniqueEmployees = allRequests.filter(e => {
        if (seen.has(e.employeeName)) return false;
        seen.add(e.employeeName);
        return true;
      });
      
      return uniqueEmployees.map(e => ({ name: e.employeeName, position: e.employeeRole }));
    } catch (error) {
      console.error('[InternalRequestsService] getUniqueEmployees error:', error);
      throw error;
    }
  }
}
