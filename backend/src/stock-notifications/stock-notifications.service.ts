import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockNotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    productTransactionId?: string;
    productId: string;
    productName: string;
    type: string;
    quantity: number;
    message: string;
    durationHours: number;
    createdBy: string;
  }) {
    const expiresAt = new Date(Date.now() + data.durationHours * 60 * 60 * 1000);
    return this.prisma.stockNotification.create({
      data: {
        productTransactionId: data.productTransactionId || null,
        productId: data.productId,
        productName: data.productName,
        type: data.type,
        quantity: data.quantity,
        message: data.message,
        durationHours: data.durationHours,
        expiresAt,
        createdBy: data.createdBy,
      },
    });
  }

  async findActive() {
    return this.prisma.stockNotification.findMany({
      where: {
        dismissed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async dismiss(id: string) {
    return this.prisma.stockNotification.update({
      where: { id },
      data: { dismissed: true },
    });
  }
}
