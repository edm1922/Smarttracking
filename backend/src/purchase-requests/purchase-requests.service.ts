import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchaseRequestsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.purchaseRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNextPrNo(dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Check if any PR exists for this day
    const sameDayPr = await this.prisma.purchaseRequest.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (sameDayPr) {
      return sameDayPr.prNo;
    }

    // 2. If new day, find max PR number and increment
    const allPrs = await this.prisma.purchaseRequest.findMany({
      select: { prNo: true },
    });

    const prNumbers = allPrs
      .map((p) => parseInt(p.prNo.replace(/\D/g, ''))) // Extract numbers only
      .filter((n) => !isNaN(n));

    const maxPr = prNumbers.length > 0 ? Math.max(...prNumbers) : 0;
    const nextNo = (maxPr + 1).toString().padStart(6, '0');
    return `PR NO. ${nextNo}`;
  }

  async create(data: any) {
    // Ensure we use the server-calculated PR number if it's not provided or to enforce consistency
    const autoPrNo = await this.getNextPrNo(data.date);

    return this.prisma.purchaseRequest.create({
      data: {
        ...data,
        prNo: autoPrNo, // Enforce the auto-generated number
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }

  update(id: string, data: any) {
    return this.prisma.purchaseRequest.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.purchaseRequest.delete({
      where: { id },
    });
  }
}
