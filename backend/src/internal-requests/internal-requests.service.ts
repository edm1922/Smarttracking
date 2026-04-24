import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InternalRequestsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      let count = await tx.internalRequest.count();
      const currentYear = new Date().getFullYear();

      for (const data of requestsData) {
        count++;
        const requestNo = `REQ-${currentYear}-${count.toString().padStart(4, '0')}`;
        const res = await tx.internalRequest.create({
          data: {
            ...data,
            date: data.date ? new Date(data.date) : new Date(),
            requestNo,
          },
        });
        results.push(res);
      }
      return results;
    });
  }

  async findAll() {
    const requests = await this.prisma.internalRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        location: true,
        targetLocation: true,
      },
    });

    // Optimize: Fetch all fulfilled requests once to count in memory
    // This avoids firing N separate count queries, which crashes the DB connection pool
    const allFulfilled = await this.prisma.internalRequest.findMany({
      where: { status: 'FULFILLED' },
      select: { employeeName: true, productId: true, createdAt: true },
    });

    return requests.map((req) => {
      const prevCount = allFulfilled.filter(
        (f) =>
          f.employeeName === req.employeeName &&
          f.productId === req.productId &&
          f.createdAt < req.createdAt,
      ).length;
      return { ...req, previousIssuancesCount: prevCount };
    });
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    remarks?: string,
  ) {
    const request = await this.prisma.internalRequest.findUnique({
      where: { id },
      include: { product: true, location: true, targetLocation: true },
    });

    if (!request) throw new NotFoundException('Request not found');

    // Logic for fulfillment
    if (status === 'FULFILLED' && request.status !== 'FULFILLED') {
      // 1. Check stock
      const stock = await this.prisma.productStock.findUnique({
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

      // 2. Perform transaction in a prisma transaction
      return this.prisma.$transaction(async (tx) => {
        // Update source stock
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
            userId: userId,
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
              userId: userId,
            },
          });
        }

        // Update request status
        return tx.internalRequest.update({
          where: { id },
          data: { status, remarks },
        });
      });
    }

    // Logic for UNDO fulfillment (Moving from FULFILLED to PENDING/APPROVED)
    if (request.status === 'FULFILLED' && status !== 'FULFILLED') {
      return this.prisma.$transaction(async (tx) => {
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
              userId: userId,
            },
          });
        }

        // 4. Update status
        return tx.internalRequest.update({
          where: { id },
          data: { status, remarks: remarks || 'Fulfillment reversed' },
        });
      });
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
      return this.prisma.$transaction(async (tx) => {
        const results = [];
        for (const id of ids) {
          const res = await this.updateStatus(id, status, userId, remarks);
          results.push(res);
        }
        return results;
      });
    }

    // For other statuses (APPROVED, REJECTED), we can do a simple updateMany
    return this.prisma.internalRequest.updateMany({
      where: { id: { in: ids } },
      data: { status, remarks },
    });
  }

  async remove(id: string) {
    const request = await this.prisma.internalRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Request not found');

    // If it was fulfilled, revert stock first
    if (request.status === 'FULFILLED') {
      await this.updateStatus(id, 'PENDING', 'system-delete');
    }

    return this.prisma.internalRequest.delete({ where: { id } });
  }

  async bulkRemove(ids: string[]) {
    for (const id of ids) {
      await this.remove(id);
    }
    return { success: true };
  }
}
