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
  
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async create(data: any) {
    // Generate a simple request number
    const count = await this.prisma.internalRequest.count();
    const requestNo = `REQ-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

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
    const startCount = await this.prisma.internalRequest.count();
    
    const formattedData = requestsData.map((data, index) => {
      const requestNo = `REQ-${currentYear}-${(startCount + index + 1).toString().padStart(4, '0')}`;
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

    const [requests, total] = await Promise.all([
      this.prisma.internalRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            }
          },
          location: {
            select: {
              id: true,
              name: true,
            }
          },
          targetLocation: {
            select: {
              id: true,
              name: true,
            }
          },
        },
      }),
      this.prisma.internalRequest.count({ where }),
    ]);

    const allIssuances = await this.prisma.internalRequest.findMany({
      where: { status: 'FULFILLED' },
      select: { id: true, productId: true, employeeName: true, date: true, supervisor: true },
      orderBy: { date: 'asc' },
    });

    const sortedRequests = [...requests].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const issuanceCounts = new Map<string, string[]>();
    allIssuances.forEach((req) => {
      const key = `${req.productId}-${req.employeeName}`;
      if (!issuanceCounts.has(key)) {
        issuanceCounts.set(key, []);
      }
      issuanceCounts.get(key)?.push(req.id);
    });

    const data = sortedRequests.map((req) => {
      const key = `${req.productId}-${req.employeeName}`;
      const ids = issuanceCounts.get(key) || [];
      const index = ids.indexOf(req.id);
      return { ...req, previousIssuancesCount: index };
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
      for (const id of ids) {
        try {
          const res = await this.updateStatus(id, status, userId, remarks);
          results.push(res);
        } catch (err) {
          results.push({ error: true, id, message: err.message });
        }
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
}
