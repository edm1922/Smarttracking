import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const totalItems = await this.prisma.item.count();
    
    const itemsByStatus = await this.prisma.item.groupBy({
      by: ['status'],
      _count: true,
    });

    const itemsByCategory = await this.prisma.item.groupBy({
      by: ['categoryId'],
      _count: true,
    });

    // Resolve category names
    const categories = await this.prisma.category.findMany();
    const categoryStats = itemsByCategory.map(stat => ({
      name: categories.find(c => c.id === stat.categoryId)?.name || 'Uncategorized',
      count: stat._count,
    }));

    const recentUpdates = await this.prisma.item.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: { slug: true, name: true, status: true, updatedAt: true },
    });

    return {
      totalItems,
      itemsByStatus,
      categoryStats,
      recentUpdates,
    };
  }
}
