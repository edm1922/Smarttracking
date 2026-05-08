import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getTrafficStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // O(1) OPTIMIZATION: Push aggregation to database level instead of fetching all rows
    const dailyTraffic = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*)::int as count
      FROM "TrafficLog"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    const topPaths = await this.prisma.$queryRaw<Array<{ path: string; count: bigint }>>`
      SELECT path, COUNT(*)::int as count
      FROM "TrafficLog"
      WHERE "createdAt" >= ${startDate}
      GROUP BY path
      ORDER BY count DESC
      LIMIT 10
    `;

    const latencyStats = await this.prisma.$queryRaw<Array<{ avg_latency: number; error_count: bigint; total: bigint }>>`
      SELECT 
        AVG("duration")::int as avg_latency,
        COUNT(CASE WHEN "statusCode" >= 500 THEN 1 END)::int as error_count,
        COUNT(*)::int as total
      FROM "TrafficLog"
      WHERE "createdAt" >= ${startDate}
    `;

    const stats = latencyStats[0];
    const avgLatency = stats?.avg_latency || 0;
    const errorCount = Number(stats?.error_count || 0);
    const totalCount = Number(stats?.total || 0);
    const healthScore = totalCount > 0 
      ? Math.max(0, Math.min(100, 100 - (errorCount / totalCount * 100)))
      : 100;

    return {
      totalRequests: totalCount,
      dailyTraffic: dailyTraffic.map(d => ({ date: d.date, count: Number(d.count) })),
      topPaths: topPaths.map(p => ({ path: p.path, count: Number(p.count) })),
      avgLatency,
      healthScore: parseFloat(healthScore.toFixed(1)),
    };
  }

  async getUsageStats() {
    const [totalUsers, totalItems, totalTransactions, totalActivityLogs, firstLog] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.item.count(),
      this.prisma.productTransaction.count(),
      this.prisma.activityLog.count(),
      this.prisma.trafficLog.findFirst({ orderBy: { createdAt: 'asc' } }),
    ]);

    const uptimeDays = firstLog 
      ? Math.floor((Date.now() - firstLog.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const recentActivity = await this.prisma.activityLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { 
        user: { select: { username: true } },
        item: { select: { name: true, slug: true } },
        product: { select: { name: true, sku: true } },
      },
    });

    return {
      totalUsers,
      totalItems,
      totalTransactions,
      totalActivityLogs,
      recentActivity,
      uptimeDays,
    };
  }
}
