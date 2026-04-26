import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../prisma/supabase.service';

@Injectable()
export class InternalRequestsService {
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
        },
      }),
      this.prisma.internalRequest.count({ where }),
    ]);

    const issuanceCounts = await this.prisma.internalRequest.groupBy({
      by: ['productId', 'employeeName'],
      where: { status: 'FULFILLED' },
      _count: { productId: true },
    });

    const issuanceMap = new Map<string, Map<string, number>>();
    issuanceCounts.forEach((i) => {
      if (!issuanceMap.has(i.productId)) {
        issuanceMap.set(i.productId, new Map());
      }
      issuanceMap.get(i.productId)?.set(i.employeeName, i._count.productId);
    });

    const data = requests.map((req) => {
      const prevCount = issuanceMap.get(req.productId)?.get(req.employeeName) ?? 0;
      return { ...req, previousIssuancesCount: prevCount };
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
      include: { product: true, location: true },
    });

    if (!request) throw new NotFoundException('Request not found');

    let validUserId = userId;
    if (userId === 'admin-system' || userId === 'system-delete') {
      const admin = await p.user.findFirst({ where: { role: 'admin' } });
      if (admin) {
        validUserId = admin.id;
      } else {
        // Fallback: get any user, or throw error if no users exist
        const anyUser = await p.user.findFirst();
        if (anyUser) validUserId = anyUser.id;
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
          'Insufficient stock in the selected location',
        );
      }

      const fulfillLogic = async (tx: any) => {
        // Update stock
        await tx.productStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: request.quantity } },
        });

        // Create Issuance Log (Transaction)
        await tx.productTransaction.create({
          data: {
            productId: request.productId,
            locationId: request.locationId,
            quantity: request.quantity,
            type: 'OUT',
            remarks: `Fulfilled Internal Request ${request.requestNo}. Issued to ${request.employeeName}`,
            userId: validUserId,
          },
        });

        // Update request status
        return tx.internalRequest.update({
          where: { id },
          data: { status, remarks },
        });
      };

      if (txOverride) {
        return fulfillLogic(txOverride);
      } else {
        return this.prisma.$transaction(async (tx) => fulfillLogic(tx));
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

        // 3. Update status
        return tx.internalRequest.update({
          where: { id },
          data: { status, remarks: remarks || 'Fulfillment reversed' },
        });
      };

      if (txOverride) {
        return undoLogic(txOverride);
      } else {
        return this.prisma.$transaction(async (tx) => undoLogic(tx));
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
      // Bulk fulfillment requires individual stock checks and transaction logging
      return this.prisma.$transaction(
        async (tx) => {
          const results = [];
          for (const id of ids) {
            const res = await this.updateStatus(id, status, userId, remarks, tx);
            results.push(res);
          }
          return results;
        },
        { timeout: 60000 },
      );
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
    return this.prisma.$transaction(
      async (tx) => {
        for (const id of ids) {
          await this.remove(id, tx);
        }
        return { success: true };
      },
      { timeout: 60000 },
    );
  }
}
