import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffInventoryService {
  constructor(private prisma: PrismaService) {}

  private async logActivity(userId: string, action: string, description: string, productName?: string, specs?: string, qty?: number, unit?: string) {
    return this.prisma.staffActivity.create({
      data: {
        userId,
        action,
        description,
        productName,
        specs,
        qty,
        unit
      }
    });
  }

  async findMine(userId: string) {
    return this.prisma.staffInventory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async adjust(userId: string, data: { productName: string; specs: string; qty: number; unit?: string }) {
    const result = await this.prisma.staffInventory.upsert({
      where: { 
        userId_productName_specs: {
          userId,
          productName: data.productName,
          specs: data.specs || 'No Specs'
        }
      },
      update: {
        qty: { increment: data.qty }
      },
      create: {
        userId,
        productName: data.productName,
        specs: data.specs || 'No Specs',
        qty: data.qty,
        unit: data.unit || 'pcs'
      }
    });

    await this.logActivity(
      userId, 
      'MANUAL_ADJUST', 
      `Manually added ${data.qty} ${data.unit || 'pcs'} of ${data.productName}`,
      data.productName,
      data.specs,
      data.qty,
      data.unit || 'pcs'
    );

    return result;
  }

  async release(userId: string, data: { 
    shift: string; 
    department: string; 
    supervisor: string; 
    remarks?: string;
    date?: string; 
    productName: string; 
    specs: string;
    itemSlug?: string; 
    qty: number; 
  }) {
    // 1. Check if staff has enough stock
    const stock = await this.prisma.staffInventory.findUnique({
      where: { 
        userId_productName_specs: {
          userId,
          productName: data.productName,
          specs: data.specs
        }
      }
    });

    if (!stock || stock.qty < data.qty) {
      throw new BadRequestException(`Insufficient stock for ${data.productName} (${data.specs})`);
    }

    // 2. Deduct from staff inventory
    await this.prisma.staffInventory.update({
      where: { id: stock.id },
      data: { qty: { decrement: data.qty } }
    });

    // 3. Log the release
    const result = await this.prisma.staffRelease.create({
      data: {
        staffId: userId,
        shift: data.shift,
        department: data.department,
        supervisor: data.supervisor,
        remarks: data.remarks,
        date: data.date ? new Date(data.date) : new Date(),
        productName: data.productName,
        specs: data.specs,
        itemSlug: data.itemSlug,
        qty: data.qty,
      }
    });

    await this.logActivity(
      userId, 
      'ITEM_RELEASE', 
      `Released ${data.qty} of ${data.productName} (Group: ${data.shift} - ${data.department})`,
      data.productName,
      data.specs,
      data.qty,
      stock.unit
    );

    return result;
  }

  async bulkRelease(userId: string, releases: any[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const rel of releases) {
        const stock = await tx.staffInventory.findUnique({
          where: { 
            userId_productName_specs: { 
              userId, 
              productName: rel.productName,
              specs: rel.specs
            }
          }
        });

        if (!stock || stock.qty < rel.qty) {
          throw new BadRequestException(`Insufficient stock for ${rel.productName} to release`);
        }

        await tx.staffInventory.update({
          where: { id: stock.id },
          data: { qty: { decrement: rel.qty } }
        });

        await tx.staffRelease.create({
          data: {
            staffId: userId,
            shift: rel.shift,
            department: rel.department,
            supervisor: rel.supervisor,
            remarks: rel.remarks,
            date: rel.date ? new Date(rel.date) : new Date(),
            productName: rel.productName,
            specs: rel.specs,
            itemSlug: rel.itemSlug,
            qty: rel.qty,
          }
        });
      }
    });

    await this.logActivity(
      userId, 
      'BULK_RELEASE', 
      `Performed bulk release of ${releases.length} items`,
      releases[0]?.productName,
      releases[0]?.specs,
      releases.reduce((sum, r) => sum + r.qty, 0),
      releases[0]?.unit || 'pcs'
    );

    return { success: true };
  }

  async findMyReleases(userId: string) {
    const releases = await this.prisma.staffRelease.findMany({
      where: { staffId: userId },
      orderBy: { date: 'desc' },
    });

    const inventories = await this.prisma.staffInventory.findMany({
      where: { userId }
    });

    return releases.map(rel => {
      const inv = inventories.find(i => 
        i.productName === rel.productName && 
        i.specs === rel.specs
      );
      return {
        ...rel,
        unit: inv?.unit || 'pcs'
      };
    });
  }

  async findMyActivities(userId: string, params: { startDate?: string; endDate?: string } = {}) {
    const { startDate, endDate } = params;
    const where: any = { userId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    return this.prisma.staffActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, data: { productName: string; specs: string }) {
    const result = await this.prisma.staffInventory.delete({
      where: { 
        userId_productName_specs: {
          userId,
          productName: data.productName,
          specs: data.specs
        }
      }
    });

    await this.logActivity(
      userId, 
      'DELETE_ITEM', 
      `Deleted ${data.productName} (${data.specs}) from inventory`,
      data.productName,
      data.specs
    );

    return result;
  }

  async update(userId: string, data: { productName: string; specs: string; qty: number; threshold: number }) {
    const result = await this.prisma.staffInventory.update({
      where: {
        userId_productName_specs: {
          userId,
          productName: data.productName,
          specs: data.specs
        }
      },
      data: {
        qty: data.qty,
        threshold: data.threshold
      }
    });

    await this.logActivity(
      userId, 
      'UPDATE_ITEM', 
      `Updated ${data.productName} qty to ${data.qty} and threshold to ${data.threshold}`,
      data.productName,
      data.specs,
      data.qty,
      result.unit
    );

    return result;
  }

  // Admin Methods
  async findAllActivities() {
    return this.prisma.staffActivity.findMany({
      include: { User: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllReleases() {
    const releases = await this.prisma.staffRelease.findMany({
      include: { User: true },
      orderBy: { date: 'desc' },
    });

    const inventories = await this.prisma.staffInventory.findMany();

    return releases.map(rel => {
      const inv = inventories.find(i => 
        i.userId === rel.staffId && 
        i.productName === rel.productName && 
        i.specs === rel.specs
      );
      return {
        ...rel,
        unit: inv?.unit || 'pcs'
      };
    });
  }

  async findAllStaffInventory() {
    return this.prisma.staffInventory.findMany({
      include: { User: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
