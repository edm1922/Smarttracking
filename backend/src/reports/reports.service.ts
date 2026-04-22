import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(locationId?: string) {
    // 1. Summary Stats
    const totalRequests = await this.prisma.internalRequest.count();
    const fulfilledRequests = await this.prisma.internalRequest.count({
      where: { status: 'FULFILLED' },
    });
    const pendingRequests = await this.prisma.internalRequest.count({
      where: { status: 'PENDING' },
    });

    // 2. Stock Distribution (Sufficient vs Need Restock)
    const stockWhere = locationId ? { locationId } : {};
    const stocks = await this.prisma.productStock.findMany({
      where: stockWhere,
      include: { product: true },
    });

    let sufficient = 0;
    let needRestock = 0;
    stocks.forEach((s) => {
      if (s.quantity <= s.product.threshold) {
        needRestock++;
      } else {
        sufficient++;
      }
    });

    const stockDistribution = [
      { name: 'Sufficient', value: sufficient },
      { name: 'Need Restock', value: needRestock },
    ];

    // 3. Monthly Issuance Trends (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const requests = await this.prisma.internalRequest.findMany({
      where: {
        status: 'FULFILLED',
        date: { gte: sixMonthsAgo },
      },
      select: { date: true },
    });

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthlyDataMap: Record<string, number> = {};

    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyDataMap[key] = 0;
    }

    requests.forEach((r) => {
      const d = new Date(r.date);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlyDataMap[key] !== undefined) {
        monthlyDataMap[key]++;
      }
    });

    const monthlyTrends = Object.entries(monthlyDataMap)
      .map(([name, count]) => ({ name, count }))
      .reverse();

    // 4. Activity Log (Combined)
    const [transactions, internalReqs, purchaseReqs] = await Promise.all([
      this.prisma.productTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { product: true, location: true },
      }),
      this.prisma.internalRequest.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      }),
      this.prisma.purchaseRequest.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const activityLog = [
      ...transactions.map((t) => ({
        id: t.id,
        type: 'STOCK',
        title: `${t.type === 'IN' ? 'Stock In' : 'Stock Out'}: ${t.product.name}`,
        description: `${t.quantity} ${t.product.unit} at ${t.location.name}`,
        date: t.createdAt,
      })),
      ...internalReqs.map((r) => ({
        id: r.id,
        type: 'REQUEST',
        title: `Internal Request: ${r.requestNo}`,
        description: `${r.employeeName} requested ${r.quantity} ${r.product.name}`,
        date: r.createdAt,
      })),
      ...purchaseReqs.map((p) => ({
        id: p.id,
        type: 'PR',
        title: `Purchase Request: ${p.prNo}`,
        description: `Dept: ${p.department} - End User: ${p.endUser}`,
        date: p.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);

    // 5. Employee/Dept Insights
    const allInternalRequests = await this.prisma.internalRequest.findMany({
      include: { product: true },
    });

    const deptCounts: Record<string, number> = {};
    const productCounts: Record<string, number> = {};

    allInternalRequests.forEach((r) => {
      deptCounts[r.departmentArea] = (deptCounts[r.departmentArea] || 0) + 1;
      productCounts[r.product.name] =
        (productCounts[r.product.name] || 0) + r.quantity;
    });

    const topDepartments = Object.entries(deptCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      summary: {
        totalRequests,
        fulfilledRequests,
        pendingRequests,
        totalItems: await this.prisma.product.count(),
        totalLocations: await this.prisma.location.count(),
      },
      stockDistribution,
      monthlyTrends,
      activityLog,
      topDepartments,
      topProducts,
    };
  }

  async getReportData(type: string, options: any = {}) {
    switch (type) {
      case 'stock-summary':
        return await this.prisma.product.findMany({
          include: {
            stocks: { include: { location: true } },
          },
        });

      case 'need-restock':
        const allProducts = await this.prisma.product.findMany({
          include: { stocks: true },
        });
        return allProducts.filter((p) => {
          const totalStock = p.stocks.reduce((sum, s) => sum + s.quantity, 0);
          return totalStock <= p.threshold;
        });

      case 'inventory-distribution':
        return await this.prisma.location.findMany({
          include: {
            stocks: { include: { product: true } },
          },
        });

      case 'supply-demand':
        // Get fulfilled vs pending for each product
        const products = await this.prisma.product.findMany({
          include: {
            internalRequests: true,
            stocks: true,
          },
        });
        return products.map((p) => ({
          name: p.name,
          sku: p.sku,
          onHand: p.stocks.reduce((sum, s) => sum + s.quantity, 0),
          pending: p.internalRequests
            .filter((r) => r.status === 'PENDING')
            .reduce((sum, r) => sum + r.quantity, 0),
          fulfilled: p.internalRequests
            .filter((r) => r.status === 'FULFILLED')
            .reduce((sum, r) => sum + r.quantity, 0),
        }));

      case 'pending-requests':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return await this.prisma.internalRequest.findMany({
          where: { status: 'PENDING' },
          include: { product: true, location: true },
          orderBy: { date: 'asc' },
        });

      case 'consumption-analysis':
        const requests = await this.prisma.internalRequest.findMany({
          where: { status: 'FULFILLED' },
          include: { product: true },
        });

        const analysis: Record<string, any> = {};
        requests.forEach((r) => {
          const key = `${r.employeeName} (${r.departmentArea})`;
          if (!analysis[key]) {
            analysis[key] = {
              employee: r.employeeName,
              dept: r.departmentArea,
              totalItems: 0,
              items: {},
            };
          }
          analysis[key].totalItems += r.quantity;
          analysis[key].items[r.product.name] =
            (analysis[key].items[r.product.name] || 0) + r.quantity;
        });
        return Object.values(analysis);

      default:
        return [];
    }
  }

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
    const categoryStats = itemsByCategory.map((stat) => ({
      name:
        categories.find((c) => c.id === stat.categoryId)?.name ||
        'Uncategorized',
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
