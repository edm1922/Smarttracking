import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { SupabaseService } from '../prisma/supabase.service';
import { WorkflowService } from '../workflow/workflow.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
    private supabaseService: SupabaseService,
    private workflowService: WorkflowService,
    private productsService: ProductsService,
  ) {}

  async create(data: any, userId: string) {
    const {
      fieldValues,
      tagIds,
      categoryId,
      batchId,
      copies = 1,
      ...itemData
    } = data;

    const createdItems = [];

    for (let i = 0; i < copies; i++) {
      let slug = '';
      let isUnique = false;
      while (!isUnique) {
        const randomStr = Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase();
        slug = `TEL-${randomStr}`;
        const existing = await this.prisma.item.findUnique({ where: { slug } });
        if (!existing) isUnique = true;
      }

      const finalData: any = {
        ...itemData,
        slug,
        categoryId: categoryId || null,
        batchId: batchId || null,
        name: itemData.name || null, // Force null if empty string
      };

      const item = await this.prisma.item.create({
        data: {
          ...finalData,
          fieldValues: {
            create: fieldValues
              ? fieldValues.map((fv: any) => ({
                  fieldId: fv.fieldId,
                  value: fv.value,
                }))
              : [],
          },
          tags: tagIds
            ? {
                create: tagIds.map((tagId: string) => ({ tagId })),
              }
            : undefined,
        },
        include: { fieldValues: true, tags: true },
      });

      await this.logsService.create({
        userId,
        itemId: item.id,
        action: 'CREATE_ITEM',
        changes: { name: item.name },
      });

      createdItems.push(item);
    }

    return copies === 1 ? createdItems[0] : createdItems;
  }

  async findAll(batchId?: string) {
    return this.prisma.item.findMany({
      where: batchId ? { batchId } : {},
      include: {
        fieldValues: { include: { field: true } },
        tags: { include: { tag: true } },
        category: true,
        batch: true,
        statusRef: true,
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
        statusRef: true,
      },
    });
    if (!item) throw new NotFoundException('Item not found');

    // Always include relevant custom fields for this item's batch so they are viewable even if empty
    const relevantFields = await this.prisma.customField.findMany({
      where: {
        OR: [{ batchId: item.batchId || 'GLOBAL_FIELDS' }, { batchId: null }],
      },
    });

    // Filter out fields that already have values to avoid duplicates
    const existingFieldIds = new Set(item.fieldValues.map((fv) => fv.fieldId));
    const newFieldValues = relevantFields
      .filter((f) => !existingFieldIds.has(f.id))
      .map((f) => ({
        id: `temp-${f.id}`,
        itemId: item.id,
        fieldId: f.id,
        value: null,
        field: f,
      }));

    (item as any).fieldValues = [...item.fieldValues, ...newFieldValues].sort(
      (a, b) => {
        const aOrder = a.field?.orderIndex || 0;
        const bOrder = b.field?.orderIndex || 0;
        if (aOrder === bOrder) {
          // Fallback to createdAt or id just to ensure stable sort
          return a.field?.id.localeCompare(b.field?.id) || 0;
        }
        return aOrder - bOrder;
      },
    );

    return item;
  }

  async update(slug: string, data: any, userId: string, userRole: string) {
    const item = await this.findOne(slug);

    if (item.locked && userRole !== 'admin') {
      // Allow inventory users to pull out (update status) even if locked
      const { status, statusId, ...otherData } = data;
      const isStatusOnly = Object.keys(otherData).length === 0 && (!data.fieldValues || data.fieldValues.length === 0);
      
      if (userRole === 'inventory' && isStatusOnly) {
        // Proceed - inventory users can pull out
      } else {
        throw new BadRequestException('Item is locked. Only admins can edit core details.');
      }
    }

    const { fieldValues, tagIds, categoryId, batchId, ...itemData } = data;

    const finalData: any = {
      ...itemData,
      categoryId:
        categoryId === undefined ? item.categoryId : categoryId || null,
      batchId: batchId === undefined ? item.batchId : batchId || null,
    };

    // Validate Status Transition
    if (itemData.statusId && itemData.statusId !== item.statusId) {
      if (item.statusId) {
        const allowed = await this.workflowService.getAllowedTransitions(
          item.statusId,
        );
        if (
          !allowed.some((s) => s.id === itemData.statusId) &&
          userRole !== 'admin'
        ) {
          throw new BadRequestException('Invalid status transition.');
        }
      }
      // Sync legacy status string for UI compatibility
      const newStatus = await this.prisma.status.findUnique({
        where: { id: itemData.statusId },
      });
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
        ...finalData,
        fieldValues: fieldValues
          ? {
              deleteMany: {},
              create: fieldValues
                .filter(
                  (fv: any) =>
                    fv.value !== null &&
                    fv.value !== undefined &&
                    fv.value !== '',
                )
                .map((fv: any) => ({
                  fieldId: fv.fieldId,
                  value: fv.value,
                })),
            }
          : undefined,
        tags: tagIds
          ? {
              deleteMany: {},
              create: tagIds.map((tagId: string) => ({ tagId })),
            }
          : undefined,
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

    // Automated Stock Log Integration for Unit Tracking
    if (data.logAction && data.logAction.startsWith('PULL_OUT_')) {
      // 1. Check if item has unit tracking
      const unitField = item.fieldValues.find(fv => fv.field.options?.hasUnitQuantity);
      if (unitField && unitField.value?.useUnitQty) {
        // 2. Extract qty from logAction (e.g., PULL_OUT_5_PAIR)
        const match = data.logAction.match(/PULL_OUT_(\d+)_/);
        if (match) {
          const qty = parseInt(match[1]);
          const productName = item.name;

          // 3. Find matching product
          const product = await this.prisma.product.findFirst({
            where: { name: { equals: productName, mode: 'insensitive' } }
          });

          if (product) {
            // 4. Log to stock (Default Location: WAREHOUSE - 906271f9-c80c-449c-81f5-60156c83e1d1)
            await this.productsService.processStock(
              product.id,
              '906271f9-c80c-449c-81f5-60156c83e1d1',
              userId,
              'OUT',
              qty,
              `QR Pull Out: ${item.slug} | User: ${userId}`
            );
          }
        }
      }
    }

    return updatedItem;
  }

  async getUnitInventory() {
    // Find all items where any field value has useUnitQty: true
    const items = await this.prisma.item.findMany({
      include: {
        fieldValues: {
          include: { field: true }
        },
        batch: true,
        category: true
      }
    });

    // Group and aggregate
    const inventory: Record<string, any> = {};
    
    items.forEach(item => {
      const unitField = item.fieldValues.find(fv => {
        const val = fv.value as any;
        return val && typeof val === 'object' && val.useUnitQty === true;
      });
      
      if (!unitField) return;
      const val = unitField.value as any;

      const name = item.name || 'Unnamed Product';
      const qty = val.qty || 0;
      const unit = val.unit || 'Units';

      if (!inventory[name]) {
        inventory[name] = {
          name,
          totalQty: 0,
          unit,
          items: []
        };
      }

      inventory[name].totalQty += qty;
      inventory[name].items.push({
        slug: item.slug,
        qty,
        batch: item.batch?.batchCode,
        status: item.status
      });
    });

    return Object.values(inventory);
  }

  async submitForm(slug: string, data: any) {
    const item = await this.findOne(slug);
    if (item.locked)
      throw new BadRequestException(
        'This form has already been submitted and is locked.',
      );

    const { fieldValues, name } = data;

    return this.prisma.item.update({
      where: { slug },
      data: {
        locked: true, // Automatically lock upon submission
        name: name || item.name, // Save the assigned name if provided
        fieldValues: fieldValues
          ? {
              deleteMany: {},
              create: fieldValues
                .filter(
                  (fv: any) =>
                    fv.value !== null &&
                    fv.value !== undefined &&
                    fv.value !== '',
                )
                .map((fv: any) => ({
                  fieldId: fv.fieldId,
                  value: fv.value,
                })),
            }
          : undefined,
      },
      include: { fieldValues: true },
    });
  }

  async toggleLock(slug: string, userId: string, userRole: string) {
    if (userRole !== 'admin')
      throw new BadRequestException('Only admins can lock/unlock items.');
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
