import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { SupabaseService } from '../prisma/supabase.service';
import { WorkflowService } from '../workflow/workflow.service';

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
    private supabaseService: SupabaseService,
    private workflowService: WorkflowService,
  ) {}

  async create(data: any, userId: string) {
    let slug = '';
    let isUnique = false;
    while (!isUnique) {
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      slug = `TEL-${randomStr}`;
      const existing = await this.prisma.item.findUnique({ where: { slug } });
      if (!existing) isUnique = true;
    }

    const { fieldValues, tagIds, ...itemData } = data;

    const item = await this.prisma.item.create({
      data: {
        ...itemData,
        slug,
        fieldValues: {
          create: fieldValues ? fieldValues.map((fv: any) => ({
            fieldId: fv.fieldId,
            value: fv.value,
          })) : [],
        },
        tags: tagIds ? {
          create: tagIds.map((tagId: string) => ({ tagId }))
        } : undefined,
      },
      include: { fieldValues: true, tags: true },
    });

    await this.logsService.create({
      userId,
      itemId: item.id,
      action: 'CREATE_ITEM',
      changes: { name: item.name },
    });

    return item;
  }

  async findAll() {
    return this.prisma.item.findMany({
      include: { 
        fieldValues: true, 
        tags: { include: { tag: true } },
        category: true,
        batch: true,
        statusRef: true
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(slug: string) {
    const item = await this.prisma.item.findUnique({
      where: { slug },
      include: {
        fieldValues: { include: { field: true } },
        tags: { include: { tag: true } },
        category: true,
        batch: true,
        statusRef: true
      },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async update(slug: string, data: any, userId: string, userRole: string) {
    const item = await this.findOne(slug);

    if (item.locked && userRole !== 'admin') {
      throw new BadRequestException('Item is locked. Only admins can edit it.');
    }

    const { fieldValues, tagIds, ...itemData } = data;
    
    // Validate Status Transition
    if (itemData.statusId && itemData.statusId !== item.statusId) {
      if (item.statusId) {
        const allowed = await this.workflowService.getAllowedTransitions(item.statusId);
        if (!allowed.some(s => s.id === itemData.statusId) && userRole !== 'admin') {
          throw new BadRequestException('Invalid status transition.');
        }
      }
      // Sync legacy status string for UI compatibility
      const newStatus = await this.prisma.status.findUnique({ where: { id: itemData.statusId } });
      if (newStatus) itemData.status = newStatus.name;
    }

    // Calculate changes for logs
    const changes: any = {};
    for (const key in itemData) {
      if (itemData[key] !== (item as any)[key]) {
        changes[key] = { old: (item as any)[key], new: itemData[key] };
      }
    }

    const updatedItem = await this.prisma.item.update({
      where: { slug },
      data: {
        ...itemData,
        fieldValues: fieldValues ? {
          deleteMany: {},
          create: fieldValues.map((fv: any) => ({
            fieldId: fv.fieldId,
            value: fv.value,
          })),
        } : undefined,
        tags: tagIds ? {
          deleteMany: {},
          create: tagIds.map((tagId: string) => ({ tagId }))
        } : undefined,
      },
      include: { fieldValues: true, tags: true },
    });

    if (Object.keys(changes).length > 0) {
      await this.logsService.create({
        userId,
        itemId: item.id,
        action: 'UPDATE_ITEM',
        changes,
      });
    }

    return updatedItem;
  }

  async toggleLock(slug: string, userId: string, userRole: string) {
    if (userRole !== 'admin') throw new BadRequestException('Only admins can lock/unlock items.');
    const item = await this.findOne(slug);
    const newLocked = !item.locked;
    
    const updated = await this.prisma.item.update({
      where: { slug },
      data: { locked: newLocked },
    });

    await this.logsService.create({
      userId,
      itemId: item.id,
      action: newLocked ? 'LOCK_ITEM' : 'UNLOCK_ITEM',
    });

    return updated;
  }

  async uploadImage(slug: string, file: any, userId: string) {
    const item = await this.findOne(slug);
    const fileName = `${slug}-${Date.now()}`;
    const imageUrl = await this.supabaseService.uploadImage(file, fileName);

    const updated = await this.prisma.item.update({
      where: { slug },
      data: { imageUrl },
    });

    await this.logsService.create({
      userId,
      itemId: item.id,
      action: 'UPLOAD_IMAGE',
    });

    return updated;
  }

  async remove(slug: string) {
    return this.prisma.item.delete({ where: { slug } });
  }
}
