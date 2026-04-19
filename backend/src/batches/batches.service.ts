import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.batch.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  create(data: { batchCode: string; description?: string }) {
    return this.prisma.batch.create({ data });
  }

  update(id: string, data: { batchCode?: string; description?: string }) {
    return this.prisma.batch.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.batch.delete({ where: { id } });
  }
}
