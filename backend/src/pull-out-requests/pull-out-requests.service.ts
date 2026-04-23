import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';

@Injectable()
export class PullOutRequestsService {
  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
  ) {}

  async create(data: { itemId: string; userId: string; qty: number; unit: string; remarks?: string }) {
    return this.prisma.pullOutRequest.create({
      data: {
        itemId: data.itemId,
        userId: data.userId,
        qty: data.qty,
        unit: data.unit,
        remarks: data.remarks,
      },
      include: { item: true, user: true },
    });
  }

  async findAll() {
    return this.prisma.pullOutRequest.findMany({
      include: { 
        item: true, 
        user: true 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPending() {
    return this.prisma.pullOutRequest.findMany({
      where: { status: 'PENDING' },
      include: { 
        item: {
          include: {
            fieldValues: { include: { field: true } }
          }
        }, 
        user: true 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, adminId: string) {
    const request = await this.prisma.pullOutRequest.findUnique({
      where: { id },
      include: { 
        item: { 
          include: { 
            fieldValues: { include: { field: true } } 
          } 
        } 
      },
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

    return this.prisma.pullOutRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async reject(id: string, adminId: string) {
    const request = await this.prisma.pullOutRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is already processed');

    return this.prisma.pullOutRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
