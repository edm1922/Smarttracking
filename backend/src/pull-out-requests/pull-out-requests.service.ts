import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';

@Injectable()
export class PullOutRequestsService {
  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
  ) {}

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

  async create(data: { 
    itemSlug?: string; 
    itemId?: string; 
    userId: string; 
    qty: number; 
    unit?: string; 
    remarks?: string; 
    imageUrl?: string;
    department?: string;
    shift?: string;
    supervisor?: string;
    attachmentUrl?: string;
    additionalImages?: string[];
    status?: string;
  }) {
    let itemId = data.itemId;
    let unit = data.unit;

    if (data.itemSlug) {
      const item = await this.prisma.item.findUnique({
        where: { slug: data.itemSlug },
        include: { fieldValues: true }
      });
      if (!item) throw new NotFoundException(`Item with slug ${data.itemSlug} not found`);
      itemId = item.id;
      
      // If unit is not provided, try to find the tracked unit
      if (!unit) {
        const unitField = item.fieldValues.find((fv: any) => {
          const val = fv.value as any;
          return val && typeof val === 'object' && val.useUnitQty === true;
        });
        if (unitField) {
          unit = (unitField.value as any).unit || 'pcs';
        } else {
          unit = 'pcs';
        }
      }
    }

    if (!itemId) throw new BadRequestException('Either itemId or itemSlug must be provided');

    console.log(`[PullOutRequestsService] Creating request for Item ID: ${itemId}, User ID: ${data.userId}, Qty: ${data.qty}`);

    const result = await this.prisma.pullOutRequest.create({
      data: {
        itemId: itemId,
        userId: data.userId,
        qty: data.qty,
        unit: unit || 'pcs',
        remarks: data.remarks,
        imageUrl: data.imageUrl,
        department: data.department,
        shift: data.shift,
        supervisor: data.supervisor,
        attachmentUrl: data.attachmentUrl,
        additionalImages: data.additionalImages || [],
        status: data.status || 'PENDING',
      },
      include: { item: true, user: true },
    });

    await this.logActivity(
      data.userId,
      'PULL_REQUEST',
      `Requested ${data.qty} ${unit || 'pcs'} of ${data.itemSlug || data.itemId}`,
      data.itemSlug,
      undefined,
      data.qty
    );

    return result;
  }

  async findByUser(userId: string, params: { skip?: number; take?: number; search?: string; status?: string; allPending?: boolean } = {}) {
    const { skip = 0, take = 20, search, status, allPending } = params;

    const where: any = {};
    
    if (allPending) {
      where.status = 'PENDING';
    } else {
      where.userId = userId;
      if (status) {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { remarks: { contains: search, mode: 'insensitive' } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { slug: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.pullOutRequest.findMany({
        where,
        skip,
        take,
        include: { 
          item: {
            include: {
              fieldValues: { include: { field: true } }
            }
          }, 
          user: {
            select: { id: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pullOutRequest.count({ where })
    ]);

    return { data, total };
  }

  async findAll(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 20, search } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { purpose: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.pullOutRequest.findMany({
        where,
        skip,
        take,
        include: { 
          item: {
            select: { id: true, name: true, slug: true }
          }, 
          user: {
            select: { id: true, username: true }
          } 
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pullOutRequest.count({ where })
    ]);

    return { data, total };
  }

  async findAllPending(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 20, search } = params;

    const where: any = { status: 'PENDING' };
    if (search) {
      where.OR = [
        { purpose: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.pullOutRequest.findMany({
        where,
        skip,
        take,
        include: { 
          item: {
            include: { fieldValues: { include: { field: true } } }
          }, 
          user: {
            select: { id: true, username: true }
          } 
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pullOutRequest.count({ where })
    ]);

    return { data, total };
  }

  async approve(id: string, adminId: string) {
    const request = await this.prisma.pullOutRequest.findUnique({
      where: { id },
      include: { item: { include: { fieldValues: { include: { field: true } } } } },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is already processed');

    const item = request.item;
    const qty = request.qty;
    
    const unitField = item.fieldValues.find((fv: any) => {
        const val = fv.value as any;
        return val && typeof val === 'object' && val.useUnitQty === true;
    });

    if (!unitField) throw new BadRequestException('Item does not have unit tracking enabled');
    
    const unitData = unitField.value as any;
    const remaining = (unitData.qty || 0) - qty;

    if (remaining < 0) throw new BadRequestException('Insufficient stock');

    const finalStatus = remaining > 0 ? 'Available' : 'Released';

    await this.itemsService.update(
        item.slug,
        {
            status: finalStatus,
            logAction: `PULL_OUT_${qty}_${request.unit.toUpperCase()}`,
            fieldValues: item.fieldValues.map((fv: any) => {
                if (fv.fieldId === unitField.fieldId) {
                    return {
                        fieldId: fv.fieldId,
                        value: { ...unitData, qty: remaining }
                    };
                }
                return { fieldId: fv.fieldId, value: fv.value };
            })
        },
        adminId,
        'admin'
    );

    await this.prisma.pullOutRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    // Calculate specs for independent instance
    const specs = item.fieldValues
      .filter((fv: any) => {
        const val = fv.value as any;
        // Exclude the unit tracking qty field from specs string
        return !(val && typeof val === 'object' && val.useUnitQty === true);
      })
      .map((fv: any) => {
        const val = fv.value;
        const fieldName = fv.field?.name || 'Unknown';
        let displayVal = '';
        
        if (val && typeof val === 'object') {
          displayVal = val.main || JSON.stringify(val);
        } else {
          displayVal = String(val);
        }
        
        return `${fieldName}: ${displayVal}`;
      })
      .join(', ');

    const productName = item.name || 'Unknown Product';
    const finalSpecs = specs || 'No Specs';

    // Automatically transfer to StaffInventory as an independent instance
    const result = await this.prisma.staffInventory.upsert({
      where: { 
        userId_productName_specs: {
          userId: request.userId,
          productName: productName,
          specs: finalSpecs
        }
      },
      update: {
        qty: { increment: qty }
      },
      create: {
        userId: request.userId,
        productName: productName,
        specs: finalSpecs,
        qty: qty,
        unit: request.unit
      }
    });

    await this.logActivity(
      request.userId,
      'REQUEST_APPROVED',
      `Pull Request for ${qty} ${request.unit} of ${productName} was approved`,
      productName,
      finalSpecs,
      qty
    );

    return result;
  }

  async reject(id: string, adminId: string) {
    const request = await this.prisma.pullOutRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is already processed');

    const result = await this.prisma.pullOutRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.logActivity(
      request.userId,
      'REQUEST_REJECTED',
      `Pull Request for ${request.qty} ${request.unit} was rejected`,
      undefined,
      undefined,
      request.qty
    );

    return result;
  }

  async bulkUpdateStatus(ids: string[], data: { status: string; supervisor?: string; remarks?: string; attachmentUrl?: string }) {
    console.log(`[PullOutRequestsService] Bulk updating ${ids.length} requests to status: ${data.status}`);
    const result = await this.prisma.pullOutRequest.updateMany({
      where: { id: { in: ids } },
      data: {
        status: data.status,
        supervisor: data.supervisor,
        remarks: data.remarks,
        attachmentUrl: data.attachmentUrl,
      },
    });
    console.log(`[PullOutRequestsService] Successfully updated ${result.count} requests`);
    return result;
  }

  async remove(id: string) {
    const request = await this.prisma.pullOutRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    
    return this.prisma.pullOutRequest.delete({ where: { id } });
  }

  async findAllPending() {
    console.log('[PullOutRequestsService] Fetching all SUBMITTED requests for admin review');
    return this.prisma.pullOutRequest.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            slug: true,
            unit: true
          }
        },
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
