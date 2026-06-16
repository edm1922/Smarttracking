import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';

@Injectable()
export class PullOutRequestsService {
  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
  ) {}

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

  async findByUser(userId: string, params: { skip?: number; take?: number; search?: string; status?: string; allPending?: boolean; startDate?: string; endDate?: string } = {}) {
    const { skip = 0, take = 20, search, status, allPending, startDate, endDate } = params;

    const where: any = {};
    if (allPending) {
      where.status = 'PENDING';
    } else {
      where.userId = userId;
      if (status) {
        where.status = status;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (startDate.length <= 10) start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { remarks: { contains: search, mode: 'insensitive' } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { slug: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    const [data, total] = await Promise.all([
      this.prisma.pullOutRequest.findMany({
        where,
        skip,
        take: safeTake,
        select: {
          id: true,
          qty: true,
          unit: true,
          status: true,
          remarks: true,
          imageUrl: true,
          createdAt: true,
          supervisor: true,
          item: {
            select: {
              id: true,
              name: true,
              slug: true,
              fieldValues: {
                select: {
                  fieldId: true,
                  value: true,
                  field: { select: { id: true, name: true } }
                }
              }
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

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[PullOutRequestsService] Slow findByUser query: ${duration}ms`);
    }

    return { data, total };
  }

  async findAll(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 20, search } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { remarks: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    const [data, total] = await Promise.all([
      this.prisma.pullOutRequest.findMany({
        where,
        skip,
        take: safeTake,
        select: {
          id: true,
          qty: true,
          unit: true,
          status: true,
          remarks: true,
          imageUrl: true,
          attachmentUrl: true,
          additionalImages: true,
          createdAt: true,
          updatedAt: true,
          supervisor: true,
          item: {
            select: { 
              id: true, 
              name: true, 
              slug: true,
              fieldValues: {
                select: {
                  fieldId: true,
                  value: true,
                  field: { select: { id: true, name: true } }
                }
              }
            }
          },
          user: {
            select: { id: true, username: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pullOutRequest.count({ where })
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[PullOutRequestsService] Slow findAll query: ${duration}ms`);
    }

    return { data, total };
  }

  async approve(id: string) {
    const request = await this.prisma.pullOutRequest.findUnique({
      where: { id },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING' && request.status !== 'SUBMITTED') throw new BadRequestException('Request is already processed');

    const result = await this.prisma.pullOutRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await this.logActivity(
      request.userId,
      'REQUEST_APPROVED',
      `Pull Request for ${request.qty} ${request.unit} was approved`,
    );

    return result;
  }

  async reject(id: string, adminId: string) {
    const request = await this.prisma.pullOutRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING' && request.status !== 'SUBMITTED') throw new BadRequestException('Request is already processed');

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

  async findAllPending(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 20, search } = params;
    console.log('[PullOutRequestsService] Fetching SUBMITTED requests for admin review');
    
    const where: any = { status: 'SUBMITTED' };
    if (search) {
      where.OR = [
        { remarks: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { slug: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const safeTake = Math.min(take ?? 20, 100);
    const start = Date.now();

    const [data, total] = await Promise.all([
      this.prisma.pullOutRequest.findMany({
        where,
        skip,
        take: safeTake,
        select: {
          id: true,
          qty: true,
          unit: true,
          status: true,
          remarks: true,
          imageUrl: true,
          attachmentUrl: true,
          additionalImages: true,
          createdAt: true,
          supervisor: true,
          item: {
            select: { id: true, name: true, slug: true, unit: true }
          },
          user: {
            select: { id: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.pullOutRequest.count({ where })
    ]);

    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[PullOutRequestsService] Slow findAllPending query: ${duration}ms`);
    }

    return { data, total };
  }

  async bulkApprove(ids: string[]) {
    const results = [];
    for (const id of ids) {
      try {
        const res = await this.approve(id);
        results.push({ id, status: 'success', data: res });
      } catch (err) {
        results.push({ id, status: 'error', error: err.message });
      }
    }
    return results;
  }

  async bulkReject(ids: string[], adminId: string) {
    const results = [];
    for (const id of ids) {
      try {
        const res = await this.reject(id, adminId);
        results.push({ id, status: 'success', data: res });
      } catch (err) {
        results.push({ id, status: 'error', error: err.message });
      }
    }
    return results;
  }
}
