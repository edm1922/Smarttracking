
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RsqService {
  constructor(private prisma: PrismaService) {}

  // --- Fabrics ---
  async getFabrics() {
    return this.prisma.fabric.findMany({
      include: {
        transactions: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFabric(id: string) {
    return this.prisma.fabric.findUnique({
      where: { id },
      include: { transactions: true },
    });
  }

  async createFabric(data: { name: string; type: string; color?: string; unit: string; unitPrice: number }) {
    return this.prisma.fabric.create({
      data,
    });
  }

  // --- Tailors ---
  async getTailors() {
    return this.prisma.tailor.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createTailor(data: { name: string; address?: string; contactPerson?: string; contactNumber?: string }) {
    return this.prisma.tailor.create({
      data,
    });
  }

  // --- Transactions ---
  async getTransactions(params?: { fabricId?: string }) {
    return this.prisma.fabricTransaction.findMany({
      where: params?.fabricId ? { fabricId: params.fabricId } : {},
      include: { fabric: true },
      orderBy: { date: 'desc' },
    });
  }

  async createFabricTransaction(data: {
    fabricId: string;
    type: string;
    quantity: number;
    remarks?: string;
    location?: string;
    date?: Date;
  }) {
    const fabric = await this.prisma.fabric.findUnique({ where: { id: data.fabricId } });
    if (!fabric) throw new NotFoundException('Fabric not found');

    const count = await this.prisma.fabricTransaction.count();
    const transactionNo = `TRN-${Date.now()}-${count}`;

    return this.prisma.fabricTransaction.create({
      data: {
        transactionNo,
        fabricId: data.fabricId,
        type: data.type,
        quantity: data.quantity,
        unit: fabric.unit,
        remarks: data.remarks,
        location: data.location || 'BODEGA',
        date: data.date || new Date(),
      },
    });
  }

  // --- Tailoring Requests (RSQ) ---
  async getRequests() {
    return this.prisma.tailoringRequest.findMany({
      include: {
        fabric: true,
        tailor: true,
        product: true,
      },
      orderBy: { rsqNo: 'desc' },
    });
  }

  async generateNextRsqNo() {
    const lastRequest = await this.prisma.tailoringRequest.findFirst({
      where: { rsqNo: { startsWith: 'RSQ-' } },
      orderBy: { rsqNo: 'desc' },
    });

    if (!lastRequest) return 'RSQ-00588'; // Start after the Excel migration point

    const lastNo = parseInt(lastRequest.rsqNo.replace('RSQ-', ''));
    const nextNo = lastNo + 1;
    return `RSQ-${String(nextNo).padStart(5, '0')}`;
  }

  async createRequest(data: {
    productId?: string;
    fabricId?: string;
    tailorId: string;
    quantityOrdered: number;
    targetDate?: Date;
    remarks?: string;
  }) {
    const rsqNo = await this.generateNextRsqNo();

    return this.prisma.tailoringRequest.create({
      data: {
        rsqNo,
        productId: data.productId,
        fabricId: data.fabricId,
        tailorId: data.tailorId,
        quantityOrdered: data.quantityOrdered,
        targetDate: data.targetDate,
        remarks: data.remarks,
        status: 'PENDING',
      },
    });
  }

  async updateRequestStatus(id: string, status: string, quantityReceived?: number) {
    const updateData: any = { status };
    if (quantityReceived !== undefined) {
      updateData.quantityReceived = quantityReceived;
    }

    return this.prisma.tailoringRequest.update({
      where: { id },
      data: updateData,
    });
  }

  async getNextSequences() {
    // 1. Calculate Next Transaction #
    // Find the latest FabricTransaction starting with 'T-'
    const lastTx = await this.prisma.fabricTransaction.findFirst({
      where: {
        transactionNo: {
          startsWith: 'T-',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextTransactionNo = 'T-2026-27'; // Default start after Excel migration point (T-2026-26)
    if (lastTx) {
      const parts = lastTx.transactionNo.split('_');
      const batchCode = parts[0]; // e.g. 'T-2026-26'
      
      const match = batchCode.match(/T-(\d+)-(\d+)/);
      if (match) {
        const year = parseInt(match[1]);
        const seq = parseInt(match[2]);
        nextTransactionNo = `T-${year}-${seq + 1}`;
      } else {
        const simpleMatch = batchCode.match(/T-(\d+)/);
        if (simpleMatch) {
          const seq = parseInt(simpleMatch[1]);
          nextTransactionNo = `T-${seq + 1}`;
        }
      }
    }

    // 2. Calculate Next RSQ #
    const nextRsqNo = await this.generateNextRsqNo();

    // 3. Today's Series Sequence
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.prisma.fabricTransaction.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const month = today.getMonth() + 1; // 1-indexed
    const day = today.getDate();
    const todaySeriesSequence = `${month}.${day}.${todayCount + 1}`;

    return {
      nextTransactionNo,
      nextRsqNo,
      todaySeriesSequence,
    };
  }

  async createBatchTransactions(items: Array<{
    transactionNo: string;
    seriesNo: string;
    rsqNo?: string;
    fabricId: string;
    type: string;
    quantity: number;
    remarks?: string;
    applicableMonth: string;
    date?: string;
    tailorId?: string;
    apparelName?: string;
  }>) {
    const createdTransactions = [];

    for (const item of items) {
      const fabric = await this.prisma.fabric.findUnique({ where: { id: item.fabricId } });
      if (!fabric) throw new NotFoundException(`Fabric not found: ${item.fabricId}`);

      // Combine Transaction No and Series No (T-2026-26_5.15.7)
      const dbTxNo = `${item.transactionNo}_${item.seriesNo}`;

      // Package remarks with RSQ, applicable month, and apparelName info
      const dbRemarks = `RSQ: ${item.rsqNo || '—'} | Month: ${item.applicableMonth || '—'} | Apparel: ${item.apparelName || '—'} | Remarks: ${item.remarks || ''}`;

      // Create fabric transaction
      const tx = await this.prisma.fabricTransaction.create({
        data: {
          transactionNo: dbTxNo,
          fabricId: item.fabricId,
          type: item.type,
          quantity: item.quantity,
          unit: fabric.unit,
          remarks: dbRemarks,
          location: 'BODEGA',
          date: item.date ? new Date(item.date) : new Date(),
        },
      });

      // If withdrawal or return (associated with an RSQ), manage TailoringRequest
      if (item.rsqNo && (item.type === 'WITHDRAWAL' || item.type === 'RETURN')) {
        const existingRequest = await this.prisma.tailoringRequest.findUnique({
          where: { rsqNo: item.rsqNo }
        });

        let targetTailorId = item.tailorId;
        if (!targetTailorId) {
          const tailors = await this.prisma.tailor.findMany({ take: 1 });
          if (tailors.length > 0) {
            targetTailorId = tailors[0].id;
          } else {
            const placeholderTailor = await this.prisma.tailor.create({
              data: { name: 'UNASSIGNED TAILOR', address: 'PLACEHOLDER' }
            });
            targetTailorId = placeholderTailor.id;
          }
        }

        const requestRemarks = item.apparelName || item.remarks || '';

        if (existingRequest) {
          await this.prisma.tailoringRequest.update({
            where: { id: existingRequest.id },
            data: {
              fabricId: item.fabricId,
              tailorId: targetTailorId,
              quantityReceived: item.type === 'RETURN'
                ? Math.max(0, existingRequest.quantityReceived - item.quantity)
                : existingRequest.quantityReceived,
              remarks: requestRemarks || existingRequest.remarks,
            }
          });
        } else {
          await this.prisma.tailoringRequest.create({
            data: {
              rsqNo: item.rsqNo,
              fabricId: item.fabricId,
              tailorId: targetTailorId,
              quantityOrdered: item.quantity,
              quantityReceived: 0,
              unit: 'pcs',
              orderDate: item.date ? new Date(item.date) : new Date(),
              status: 'PENDING',
              remarks: requestRemarks,
            }
          });
        }
      }

      createdTransactions.push(tx);
    }

    return createdTransactions;
  }

  async deleteTransactions(ids: string[]) {
    return this.prisma.fabricTransaction.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }
}

