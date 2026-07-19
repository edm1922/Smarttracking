import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetRequestsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.budgetRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNextBgtNo() {
    const all = await this.prisma.budgetRequest.findMany({
      select: { bgtNo: true },
    });

    const numbers = all
      .map((r) => parseInt(r.bgtNo.replace(/\D/g, '')))
      .filter((n) => !isNaN(n));

    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNo = (max + 1).toString().padStart(6, '0');
    return `BGT-${nextNo}`;
  }

  async create(data: any) {
    const autoBgtNo = await this.getNextBgtNo();
    return this.prisma.budgetRequest.create({
      data: {
        ...data,
        bgtNo: autoBgtNo,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }

  update(id: string, data: any) {
    return this.prisma.budgetRequest.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.budgetRequest.delete({
      where: { id },
    });
  }
}
