import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAnalytics(locationId?: string, startDate?: string, endDate?: string) {
    const dateFilter: Prisma.InternalRequestWhereInput = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        const s = new Date(startDate);
        if (startDate.length <= 10) s.setHours(0, 0, 0, 0);
        dateFilter.date.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (endDate.length <= 10) e.setHours(23, 59, 59, 999);
        dateFilter.date.lte = e;
      }
    }

    // 1. Summary Stats
    const summaryWhere = {
      ...(locationId ? { locationId } : {}),
      ...dateFilter,
    };
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
        ...(locationId ? { locationId } : {}),
        createdAt: { gte: today },
      },
    });

    // 2. Stock Distribution (Sufficient vs Need Restock) - Not affected by date range as it's current snapshot
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

    // 3. Monthly Issuance Trends
    let trendStartDate = new Date();
    trendStartDate.setMonth(trendStartDate.getMonth() - 6);
    if (startDate) {
      trendStartDate = new Date(startDate);
      if (startDate.length <= 10) trendStartDate.setHours(0, 0, 0, 0);
    }

    let trendEndDate = new Date();
    if (endDate) {
      trendEndDate = new Date(endDate);
      if (endDate.length <= 10) trendEndDate.setHours(23, 59, 59, 999);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyDataMap: Record<string, number> = {};
    
    // Generate months between startDate and endDate
    let current = new Date(trendStartDate);
    current.setDate(1);
    const end = new Date(trendEndDate);
    end.setDate(1);

    while (current <= end) {
      const key = `${monthNames[current.getMonth()]} ${current.getFullYear()}`;
      monthlyDataMap[key] = 0;
      current.setMonth(current.getMonth() + 1);
    }

    const irFilter = locationId ? Prisma.sql`AND "locationId" = ${locationId}` : Prisma.empty;
    const dateSqlFilter = Prisma.sql`AND date >= ${trendStartDate} AND date <= ${trendEndDate}`;
    
    const monthlyCountsRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR(date, 'FMMon YYYY') as month,
        COUNT(*)::int as count
      FROM "InternalRequest"
      WHERE status = 'FULFILLED'
      ${irFilter}
      ${dateSqlFilter}
      GROUP BY TO_CHAR(date, 'FMMon YYYY')
    `;

    monthlyCountsRaw.forEach((row) => {
      if (monthlyDataMap[row.month] !== undefined) {
        monthlyDataMap[row.month] = row.count;
      }
    });

    const monthlyTrends = Object.entries(monthlyDataMap)
      .map(([name, count]) => ({ name, count }));

    // 4. Activity Log (Combined) - Last 15 events (Snapshot)
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
    }).then(res => res.map(d => ({ name: d.departmentArea, requests: d._count.departmentArea })));

    const topProductsRaw = await this.prisma.$queryRaw<any[]>`
      SELECT p.name, SUM(ir.quantity)::int as count
      FROM "InternalRequest" ir
      JOIN "Product" p ON ir."productId" = p.id
      WHERE ir.status = 'FULFILLED' 
      ${locationId ? Prisma.sql`AND ir."locationId" = ${locationId}` : Prisma.empty}
      AND ir.date >= ${trendStartDate} AND ir.date <= ${trendEndDate}
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
      WHERE pt.type = 'OUT' 
      ${locationId ? Prisma.sql`AND pt."locationId" = ${locationId}` : Prisma.empty}
      AND pt."createdAt" >= ${trendStartDate} AND pt."createdAt" <= ${trendEndDate}
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
      WHERE pt.type = 'OUT' 
      ${locationId ? Prisma.sql`AND pt."locationId" = ${locationId}` : Prisma.empty}
      AND pt."createdAt" >= ${trendStartDate} AND pt."createdAt" <= ${trendEndDate}
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

      case 'custom-item-report':
        const productIdsArr = options.productIds
          ? options.productIds.split(',').filter(Boolean)
          : [];
        const productWhere = productIdsArr.length > 0 ? { id: { in: productIdsArr } } : {};

        const startDate = options.startDate ? (() => { const d = new Date(options.startDate); if (options.startDate.length <= 10) d.setHours(0, 0, 0, 0); return d; })() : undefined;
        const endDate = options.endDate ? (() => { const d = new Date(options.endDate); if (options.endDate.length <= 10) d.setDate(d.getDate() + 1); else d.setDate(d.getDate() + 1); return d; })() : undefined;
        const irDateFilter = startDate || endDate ? {
          date: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lt: endDate }),
          },
        } : {};
        const txDateFilter = startDate || endDate ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lt: endDate }),
          },
        } : {};

        const products = await this.prisma.product.findMany({
          where: productWhere,
          include: {
            stocks: { include: { location: true } },
            InternalRequest: {
              where: irDateFilter,
              select: { id: true, status: true, quantity: true },
            },
            ProductTransaction: {
              where: txDateFilter,
              select: { id: true, type: true, remarks: true, quantity: true },
            },
          },
          orderBy: { name: 'asc' },
        });
        return products.map((p) => {
          const allIRs = (p as any).InternalRequest;
          const fulfilledIRs = allIRs.filter((ir: any) => ir.status === 'FULFILLED');
          const outTxs = (p as any).ProductTransaction.filter((t: any) => t.type === 'OUT');
          const inTxs = (p as any).ProductTransaction.filter((t: any) => t.type === 'IN');
          const endingStock = p.stocks.reduce((sum: number, s: any) => sum + s.quantity, 0);
          const stockInQty = inTxs.reduce((sum: number, t: any) => sum + t.quantity, 0);
          const allOutQty = outTxs.reduce((sum: number, t: any) => sum + t.quantity, 0);
          const hasDateRange = !!(options.startDate || options.endDate);
          const beginningStock = hasDateRange ? endingStock - stockInQty + allOutQty : endingStock;
          const stockIn = hasDateRange ? stockInQty : 0;
          const stockOut = hasDateRange ? allOutQty : 0;
          return {
            sku: p.sku,
            name: p.name,
            description: p.description || '',
            unit: p.unit,
            beginningStock,
            stockIn,
            stockOut,
            endingStock,
          };
        });

      case 'frequency':
        const freqStart = options.startDate ? (() => { const d = new Date(options.startDate); if (options.startDate.length <= 10) d.setHours(0, 0, 0, 0); return d; })() : null;
        const freqEnd = options.endDate ? (() => { const d = new Date(options.endDate); if (options.endDate.length <= 10) d.setDate(d.getDate() + 1); else d.setDate(d.getDate() + 1); return d; })() : null;

        const freqDateSql = freqStart && freqEnd
          ? Prisma.sql`AND ir.date >= ${freqStart} AND ir.date < ${freqEnd}`
          : freqStart
          ? Prisma.sql`AND ir.date >= ${freqStart}`
          : freqEnd
          ? Prisma.sql`AND ir.date < ${freqEnd}`
          : Prisma.sql``;

        const freqData = await this.prisma.$queryRaw<any[]>`
          SELECT
            p.name as "productName",
            p.sku,
            COUNT(*)::int as "totalCount",
            MIN(ir.date) as "earliestDate",
            MAX(ir.date) as "latestDate"
          FROM "InternalRequest" ir
          JOIN "Product" p ON ir."productId" = p.id
          WHERE 1=1 ${freqDateSql}
          GROUP BY p.name, p.sku
          ORDER BY "totalCount" DESC
          LIMIT 50
        `;

        const rangeStart = freqStart || (freqData.length > 0 ? new Date(freqData[0].earliestDate) : new Date());
        const rangeEnd = freqEnd || new Date();
        const msInWeek = 7 * 24 * 60 * 60 * 1000;
        const numberOfWeeks = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / msInWeek);

        return freqData.map((t, idx) => ({
          rank: idx + 1,
          productName: t.productName,
          sku: t.sku,
          totalCount: t.totalCount,
          frequencyPerWeek: parseFloat((t.totalCount / numberOfWeeks).toFixed(1)),
        }));

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

    // O(1) OPTIMIZATION: Build Map for O(1) category lookups instead of O(n) find
    const categories = await this.prisma.category.findMany();
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const categoryStats = itemsByCategory.map((stat) => ({
      name: stat.categoryId ? (categoryMap.get(stat.categoryId) || 'Uncategorized') : 'Uncategorized',
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

  // --- New Analytics Endpoints ---

  private getWhereClause(startDate?: string, endDate?: string, dateField: string = 'createdAt') {
    if (!startDate && !endDate) return {};
    return {
      [dateField]: {
        ...(startDate && { gte: new Date(startDate + 'T00:00:00.000Z') }),
        ...(endDate && { lte: new Date(endDate + 'T00:00:00.000Z') }),
      },
    };
  }

  async getMostIssuedProducts(startDate?: string, endDate?: string) {
    const cacheKey = `reports:most-issued:${startDate || 'all'}:${endDate || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const where = this.getWhereClause(startDate, endDate);
    const topProducts = await this.prisma.productTransaction.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where,
      orderBy: { _sum: { quantity: 'desc' } },
      take: 50,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: topProducts.map((p) => p.productId) } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const result = topProducts.map((tp) => ({
      productId: tp.productId,
      name: productMap.get(tp.productId) || 'Unknown',
      totalIssued: tp._sum.quantity ?? 0,
    }));

    await this.cacheManager.set(cacheKey, result, 60000); // 60s
    return result;
  }

  async getDailyStockMovement(startDate?: string, endDate?: string) {
    const cacheKey = `reports:daily-movement:${startDate || 'all'}:${endDate || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const conditions = [];

    if (startDate) {
      conditions.push(Prisma.sql`"createdAt" >= ${new Date(startDate + 'T00:00:00.000Z')}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`"createdAt" <= ${new Date(endDate + 'T00:00:00.000Z')}`);
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    const query = Prisma.sql`
      SELECT DATE_TRUNC('day', "createdAt") as date,
             SUM(quantity)::int as total
      FROM "ProductTransaction"
      ${whereClause}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date DESC
      LIMIT 50
    `;

    const result = await this.prisma.$queryRaw(query);
    await this.cacheManager.set(cacheKey, result, 60000); // 60s
    return result;
  }

  async getIssuancesByLocation(startDate?: string, endDate?: string) {
    const cacheKey = `reports:by-location:${startDate || 'all'}:${endDate || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const where = this.getWhereClause(startDate, endDate);
    const result = await this.prisma.productTransaction.groupBy({
      by: ['locationId'],
      _sum: { quantity: true },
      where,
      orderBy: { _sum: { quantity: 'desc' } },
      take: 50,
    });

    await this.cacheManager.set(cacheKey, result, 60000); // 60s
    return result;
  }

  async getRequestStatusDistribution(startDate?: string, endDate?: string) {
    const cacheKey = `reports:status-dist:${startDate || 'all'}:${endDate || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const where = this.getWhereClause(startDate, endDate);
    const result = await this.prisma.internalRequest.groupBy({
      by: ['status'],
      _count: { status: true },
      where,
    });

    await this.cacheManager.set(cacheKey, result, 30000); // 30s
    return result;
  }

  async getTopEmployees(startDate?: string, endDate?: string) {
    const cacheKey = `reports:top-employees:${startDate || 'all'}:${endDate || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const where = this.getWhereClause(startDate, endDate);
    const result = await this.prisma.internalRequest.groupBy({
      by: ['employeeName'],
      _count: { employeeName: true },
      where,
      orderBy: { _count: { employeeName: 'desc' } },
      take: 50,
    });

    await this.cacheManager.set(cacheKey, result, 60000); // 60s
    return result;
  }

  async getProductUsageTrend(productId: string, startDate?: string, endDate?: string) {
    const conditions = [Prisma.sql`"productId" = ${productId}`];

    if (startDate) {
      conditions.push(Prisma.sql`"createdAt" >= ${new Date(startDate + 'T00:00:00.000Z')}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`"createdAt" <= ${new Date(endDate + 'T00:00:00.000Z')}`);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const query = Prisma.sql`
      SELECT DATE_TRUNC('day', "createdAt") as date,
             SUM(quantity)::int as total
      FROM "ProductTransaction"
      ${whereClause}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
      LIMIT 50
    `;

    return await this.prisma.$queryRaw(query);
  }

  async getLowStockAlertReport() {
    const productsWithStock = await this.prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        threshold: true,
        stocks: {
          select: { quantity: true },
        },
      },
    });

    const lowStockItems = productsWithStock
      .map((p) => ({
        productId: p.id,
        totalQuantity: p.stocks.reduce((sum, s) => sum + s.quantity, 0),
        product: { name: p.name, description: p.description, threshold: p.threshold },
      }))
      .filter((item) => item.totalQuantity <= item.product.threshold);

    if (lowStockItems.length === 0) return [];

    const requestCounts = await this.prisma.internalRequest.groupBy({
      by: ['productId'],
      where: {
        productId: { in: lowStockItems.map((i) => i.productId) },
      },
      _count: { id: true },
      _sum: { quantity: true },
    });

    const stockOutCounts = await this.prisma.productTransaction.groupBy({
      by: ['productId'],
      where: {
        productId: { in: lowStockItems.map((i) => i.productId) },
        type: 'OUT',
      },
      _count: { id: true },
    });

    const stockOutCountMap = new Map(
      stockOutCounts.map((s) => [s.productId, s._count.id])
    );

    const requestCountMap = new Map(
      requestCounts.map((r) => [
        r.productId,
        {
          requestCount: r._count.id,
          totalRequestedQty: r._sum.quantity ?? 0,
        },
      ])
    );

    return lowStockItems
      .map((item) => ({
        productId: item.productId,
        quantity: item.totalQuantity,
        product: item.product,
        requestCount: (requestCountMap.get(item.productId)?.requestCount ?? 0) +
                      (stockOutCountMap.get(item.productId) ?? 0),
        totalRequestedQty:
          requestCountMap.get(item.productId)?.totalRequestedQty ?? 0,
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 50);
  }

  async getBatchLevelAnalytics() {
    return await this.prisma.item.groupBy({
      by: ['batchId'],
      _count: { batchId: true },
      orderBy: { _count: { batchId: 'desc' } },
      take: 50,
    });
  }
}
