import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffInventoryService {
  constructor(private prisma: PrismaService) {}

  private async logActivity(userId: string, action: string, description: string, productName?: string, specs?: string, qty?: number) {
    return this.prisma.staffActivity.create({
      data: {
        userId,
        action,
        description,
        productName,
        specs,
        qty
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
      data.qty
    );

    return result;
  }

  async release(userId: string, data: { 
    employeeName: string; 
    shift: string; 
    department: string; 
    supervisor: string; 
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
        employeeName: data.employeeName,
        shift: data.shift,
        department: data.department,
        supervisor: data.supervisor,
        productName: data.productName,
        specs: data.specs,
        itemSlug: data.itemSlug,
        qty: data.qty,
      }
    });

    await this.logActivity(
      userId, 
      'ITEM_RELEASE', 
      `Released ${data.qty} of ${data.productName} to ${data.employeeName}`,
      data.productName,
      data.specs,
      data.qty
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
          throw new BadRequestException(`Insufficient stock for ${rel.productName} to release to ${rel.employeeName}`);
        }

        await tx.staffInventory.update({
          where: { id: stock.id },
          data: { qty: { decrement: rel.qty } }
        });

        await tx.staffRelease.create({
          data: {
            staffId: userId,
            employeeName: rel.employeeName,
            shift: rel.shift,
            department: rel.department,
            supervisor: rel.supervisor,
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
      releases[0]?.specs
    );

    return { success: true };
  }

  async findMyReleases(userId: string) {
    return this.prisma.staffRelease.findMany({
      where: { staffId: userId },
      orderBy: { date: 'desc' },
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
      data.qty
    );

    return result;
  }

  // Admin Methods
  async findAllActivities() {
    return this.prisma.staffActivity.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllStaffInventory() {
    return this.prisma.staffInventory.findMany({
      include: { user: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
