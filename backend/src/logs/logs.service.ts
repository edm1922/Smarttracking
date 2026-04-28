import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async findByItem(itemId: string, params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 20, search } = params;
    
    const where: any = { itemId };
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: safeTake,
        select: {
          id: true,
          action: true,
          changes: true,
          createdAt: true,
          userId: true,
          itemId: true,
          user: {
            select: { username: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where })
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[LogsService] Slow findByItem query: ${duration}ms`);
    }

    return { data, total };
  }

  async findAll(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 20, search } = params;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: safeTake,
        select: {
          id: true,
          action: true,
          changes: true,
          createdAt: true,
          userId: true,
          itemId: true,
          user: {
            select: { username: true, role: true },
          },
          item: {
            select: { slug: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where })
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[LogsService] Slow findAll query: ${duration}ms`);
    }

    return { data, total };
  }

  async create(data: {
    userId: string;
    itemId?: string;
    action: string;
    changes?: any;
  }) {
    return this.prisma.activityLog.create({
      data,
    });
  }
}
