
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
}
