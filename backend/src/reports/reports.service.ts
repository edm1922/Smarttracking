import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(locationId?: string) {
    // 1. Summary Stats
    const summaryWhere = locationId ? { locationId } : {};
    const totalRequests = await this.prisma.internalRequest.count({ where: summaryWhere });
    const fulfilledRequests = await this.prisma.internalRequest.count({
      where: { ...summaryWhere, status: 'FULFILLED' },
    });
    const pendingRequests = await this.prisma.internalRequest.count({
      where: { ...summaryWhere, status: 'PENDING' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRequests = await this.prisma.internalRequest.count({
      where: {
        ...summaryWhere,
        createdAt: { gte: today },
      },
    });

    // 2. Stock Distribution (Sufficient vs Need Restock)
    const stockFilter = locationId ? Prisma.sql`WHERE ps."locationId" = ${locationId}` : Prisma.empty;
    const stockRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(CASE WHEN ps.quantity <= p.threshold THEN 1 END)::int as "needRestock",
        COUNT(CASE WHEN ps.quantity > p.threshold THEN 1 END)::int as "sufficient"
      FROM "ProductStock" ps
      JOIN "Product" p ON ps."productId" = p.id
      ${stockFilter}
    `;
    const stockDistribution = [
      { name: 'Sufficient', value: Number(stockRaw[0]?.sufficient || 0) },
      { name: 'Need Restock', value: Number(stockRaw[0]?.needRestock || 0) },
    ];

    // 3. Monthly Issuance Trends (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyDataMap: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyDataMap[key] = 0;
    }

    const irFilter = locationId ? Prisma.sql`AND "locationId" = ${locationId}` : Prisma.empty;
    const monthlyCountsRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR(date, 'FMMon YYYY') as month,
        COUNT(*)::int as count
      FROM "InternalRequest"
      WHERE status = 'FULFILLED' AND date >= ${sixMonthsAgo}
      ${irFilter}
      GROUP BY TO_CHAR(date, 'FMMon YYYY')
    `;

    monthlyCountsRaw.forEach((row) => {
      if (monthlyDataMap[row.month] !== undefined) {
        monthlyDataMap[row.month] = row.count;
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
    const topDepartments = await this.prisma.internalRequest.groupBy({
      by: ['departmentArea'],
      _count: { departmentArea: true },
      where: summaryWhere,
      orderBy: { _count: { departmentArea: 'desc' } },
      take: 5
    }).then(res => res.map(d => ({ name: d.departmentArea, value: d._count.departmentArea })));

    const topProductsRaw = await this.prisma.$queryRaw<any[]>`
      SELECT p.name, SUM(ir.quantity)::int as count
      FROM "InternalRequest" ir
      JOIN "Product" p ON ir."productId" = p.id
      WHERE ir.status = 'FULFILLED' ${locationId ? Prisma.sql`AND ir."locationId" = ${locationId}` : Prisma.empty}
      GROUP BY p.name
      ORDER BY count DESC
      LIMIT 5
    `;
    const topProducts = topProductsRaw.map(p => ({ name: p.name, count: p.count }));

    // 6. Admin Stock Transaction Summaries (OUT)
    const outTransactionsRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.id as "productId",
        p.name as "productName",
        p.description as "productDescription",
        SUM(pt.quantity)::int as count
      FROM "ProductTransaction" pt
      JOIN "Product" p ON pt."productId" = p.id
      WHERE pt.type = 'OUT' ${locationId ? Prisma.sql`AND pt."locationId" = ${locationId}` : Prisma.empty}
      GROUP BY p.id, p.name, p.description
      ORDER BY count DESC
      LIMIT 5
    `;
    const topConsumedStock = outTransactionsRaw.map(t => ({
      name: t.productName,
      description: t.productDescription || '',
      count: t.count
    }));

    const topUsersRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(
          (REGEXP_MATCH(pt.remarks, 'Req by:\\s*([^|]+)'))[1],
          (REGEXP_MATCH(pt.remarks, 'To:\\s*([^|]+)'))[1],
          'Admin (' || COALESCE(u.username, 'Unknown') || ')'
        ) as name,
        SUM(pt.quantity)::int as count
      FROM "ProductTransaction" pt
      LEFT JOIN "User" u ON pt."userId" = u.id
      WHERE pt.type = 'OUT' ${locationId ? Prisma.sql`AND pt."locationId" = ${locationId}` : Prisma.empty}
      GROUP BY name
      ORDER BY count DESC
      LIMIT 5
    `;
    const topStockUsers = topUsersRaw.map(u => ({ name: u.name, count: u.count }));

    return {
      summary: {
        totalRequests,
        fulfilledRequests,
        pendingRequests,
        todayRequests,
        totalItems: await this.prisma.product.count(),
        totalLocations: await this.prisma.location.count(),
      },
      stockDistribution,
      monthlyTrends,
      activityLog,
      topDepartments,
      topProducts,
      topConsumedStock,
      topStockUsers,
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
        const productsRaw = await this.prisma.$queryRaw<any[]>`
          SELECT 
            p.id, p.name, p.sku, p.threshold,
            COALESCE(SUM(ps.quantity), 0)::int as "totalStock"
          FROM "Product" p
          LEFT JOIN "ProductStock" ps ON p.id = ps."productId"
          GROUP BY p.id, p.name, p.sku, p.threshold
          HAVING COALESCE(SUM(ps.quantity), 0) <= p.threshold
        `;
        return productsRaw.map((p) => ({
          ...p,
          stocks: [{ quantity: p.totalStock }]
        }));

      case 'inventory-distribution':
        return await this.prisma.location.findMany({
          include: {
            stocks: { include: { product: true } },
          },
        });

      case 'supply-demand':
        const sdRaw = await this.prisma.$queryRaw<any[]>`
          SELECT 
            p.name, 
            p.sku,
            COALESCE((SELECT SUM(quantity) FROM "ProductStock" WHERE "productId" = p.id), 0)::int as "onHand",
            COALESCE((SELECT SUM(quantity) FROM "InternalRequest" WHERE "productId" = p.id AND status = 'PENDING'), 0)::int as "pending",
            COALESCE((SELECT SUM(quantity) FROM "InternalRequest" WHERE "productId" = p.id AND status = 'FULFILLED'), 0)::int as "fulfilled"
          FROM "Product" p
        `;
        return sdRaw;

      case 'pending-requests':
        return await this.prisma.internalRequest.findMany({
          where: { status: 'PENDING' },
          include: { product: true, location: true },
          orderBy: { date: 'asc' },
        });

      case 'consumption-analysis':
        const analysisRaw = await this.prisma.$queryRaw<any[]>`
          SELECT 
            ir."employeeName" as employee, 
            ir."departmentArea" as dept, 
            p.name as "productName", 
            SUM(ir.quantity)::int as count
          FROM "InternalRequest" ir
          JOIN "Product" p ON ir."productId" = p.id
          WHERE ir.status = 'FULFILLED'
          GROUP BY ir."employeeName", ir."departmentArea", p.name
        `;
        
        const analysis: Record<string, any> = {};
        analysisRaw.forEach((r) => {
          const key = `${r.employee} (${r.dept})`;
          if (!analysis[key]) {
            analysis[key] = {
              employee: r.employee,
              dept: r.dept,
              totalItems: 0,
              items: {},
            };
          }
          analysis[key].totalItems += r.count;
          analysis[key].items[r.productName] = r.count;
        });
        return Object.values(analysis);

      case 'top-consumed-stock':
        const outTransactionsRaw = await this.prisma.$queryRaw<any[]>`
          SELECT 
            p.id as "productId",
            p.name as "productName",
            p.description as "productDescription",
            SUM(pt.quantity)::int as count
          FROM "ProductTransaction" pt
          JOIN "Product" p ON pt."productId" = p.id
          WHERE pt.type = 'OUT'
          GROUP BY p.id, p.name, p.description
          ORDER BY count DESC
          LIMIT 50
        `;
        return outTransactionsRaw.map((t) => ({
          name: t.productName,
          description: t.productDescription || '',
          count: t.count
        }));

      case 'top-requesters':
        const topUsersRaw = await this.prisma.$queryRaw<any[]>`
          SELECT 
            COALESCE(
              (REGEXP_MATCH(pt.remarks, 'Req by:\\s*([^|]+)'))[1],
              (REGEXP_MATCH(pt.remarks, 'To:\\s*([^|]+)'))[1],
              'Admin (' || COALESCE(u.username, 'Unknown') || ')'
            ) as name,
            SUM(pt.quantity)::int as count
          FROM "ProductTransaction" pt
          LEFT JOIN "User" u ON pt."userId" = u.id
          WHERE pt.type = 'OUT'
          GROUP BY name
          ORDER BY count DESC
          LIMIT 50
        `;
        return topUsersRaw.map((u) => ({ name: u.name, count: u.count }));

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
