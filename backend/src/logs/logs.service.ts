import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async findByItem(itemId: string) {
    return this.prisma.activityLog.findMany({
      where: { itemId },
      include: {
        user: {
          select: { username: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { userId: string; itemId?: string; action: string; changes?: any }) {
    return this.prisma.activityLog.create({
      data,
    });
  }
}
