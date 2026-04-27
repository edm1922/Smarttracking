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
        OR: [{ batchId: item.batchId }, { batchId: null }],
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

    const allFieldValues = [...item.fieldValues, ...newFieldValues].sort((a, b) => {
      const aOrder = a.field?.orderIndex ?? 0;
      const bOrder = b.field?.orderIndex ?? 0;
      if (aOrder === bOrder) {
        return (a.field?.id || '').localeCompare(b.field?.id || '');
      }
      return aOrder - bOrder;
    });

    return {
      ...item,
      fieldValues: allFieldValues,
    };
  }

  async update(slug: string, data: any, userId: string, userRole: string) {
    const item = await this.findOne(slug);

    if (item.locked && userRole !== 'admin') {
      // Allow inventory users to pull out (update status/fieldValues) even if locked
      const { status, statusId, fieldValues, logAction, ...otherData } = data;
      const isInventoryAction = userRole === 'inventory' && Object.keys(otherData).length === 0;
      
      if (!isInventoryAction) {
        throw new BadRequestException('Item is locked. Only admins can edit core details.');
      }
    }

    const { fieldValues, tagIds, categoryId, batchId, ...itemData } = data;

    // Destructure logAction so it's not passed to the Prisma update call
    const { logAction, ...cleanItemData } = itemData;

    const finalData: any = {
      ...cleanItemData,
      categoryId:
        categoryId === undefined ? item.categoryId : categoryId || null,
      batchId: batchId === undefined ? item.batchId : batchId || null,
    };

    delete finalData.logAction;
    delete finalData.tagIds;

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
        locked: true, // Auto-lock after admin/staff update
        name: cleanItemData.name,
        description: cleanItemData.description,
        status: cleanItemData.status,
        imageUrl: cleanItemData.imageUrl,
        isLegacy: cleanItemData.isLegacy,
        supplierId: cleanItemData.supplierId,
        unit: cleanItemData.unit,
        trackingType: cleanItemData.trackingType,
        categoryId: finalData.categoryId,
        batchId: finalData.batchId,
        statusId: itemData.statusId, // Use original statusId if present
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
      try {
        // 1. Check if item has unit tracking (check payload first, then existing)
        const fieldValuesPayload = data.fieldValues || [];
        const unitData = fieldValuesPayload.find((fv: any) => fv.value?.useUnitQty)?.value || 
                         item.fieldValues.find((fv: any) => (fv.value as any)?.useUnitQty)?.value as any;

        if (unitData?.useUnitQty) {
          // 2. Extract qty from logAction (e.g., PULL_OUT_5_PAIR)
          const match = data.logAction.match(/PULL_OUT_(\d+)_/);
          if (match) {
            const qty = parseInt(match[1]);
            const productName = item.name;

            if (productName) {
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
                ).catch(err => {
                  console.error('Stock processing failed:', err.message);
                  // We don't rethrow here to prevent 500, but the audit log will still exist
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Automated stock log failed:', err.message);
      }
    }

    return updatedItem;
  }

  async getUnitInventory() {
    // Find all items where any field value has useUnitQty: true
    const items = await this.prisma.item.findMany({
      where: {
        fieldValues: {
          some: {
            value: {
              path: ['useUnitQty'],
              equals: true
            }
          }
        }
      },
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
      
      // Aggregate unique specs for the group
      if (!inventory[name].specs) inventory[name].specs = {};
      item.fieldValues.forEach(fv => {
        const v = fv.value as any;
        let displayValue: string | null = null;

        if (v && typeof v === 'object' && v.useUnitQty) {
          if (v.main) displayValue = String(v.main);
        } else {
          displayValue = typeof fv.value === 'object' ? JSON.stringify(fv.value) : String(fv.value);
        }

        if (displayValue && displayValue.trim() !== '') {
          const fieldName = fv.field?.name || 'Unknown Field';
          if (!inventory[name].specs[fieldName]) {
            inventory[name].specs[fieldName] = new Set();
          }
          inventory[name].specs[fieldName].add(displayValue);
        }
      });

      let threshold = 5;
      let totalCapacity = qty;

      item.fieldValues.forEach(fv => {
        const v = fv.value as any;
        if (v && typeof v === 'object' && v.useUnitQty) {
          if (v.threshold !== undefined) threshold = v.threshold;
          // We can assume the initial qty set during generation was the capacity
          // or we can look for a capacity field if the user adds one.
          // For now, let's treat the current qty as capacity if it's the first time, 
          // but better if we had a dedicated capacity field.
          // The user said "the apparels/products will be place on large cellophanes... each cellophane will have its own QR code which correspond to quantity"
          // So the 'qty' is the current count.
        }
      });

      inventory[name].items.push({
        slug: item.slug,
        qty,
        threshold,
        batch: item.batch?.batchCode,
        status: item.status,
        fieldValues: item.fieldValues.map(fv => ({
          fieldId: fv.fieldId,
          name: fv.field?.name || 'Unknown Field',
          value: fv.value
        }))
      });
    });

    // Convert Sets to Arrays for JSON serialization
    const result = Object.values(inventory).map((group: any) => {
      if (group.specs) {
        Object.keys(group.specs).forEach(key => {
          group.specs[key] = Array.from(group.specs[key]);
        });
      }
      return group;
    });

    // Fallback: if nothing found via unitQty path, attempt a lightweight fallback
    // to ensure the explorer has something to display (safe-guard for missing data).
    if (result.length === 0) {
      const allItems = await this.prisma.item.findMany({
        include: { fieldValues: { include: { field: true } }, batch: true, category: true }
      });
      const fallback: Record<string, any> = {};
      allItems.forEach(it => {
        const name = it.name || it.slug || 'Unnamed Product';
        const unitField = it.fieldValues.find((fv: any) => fv.value && typeof fv.value === 'object' && (fv.value as any).unit);
        const unit = ((unitField?.value as any)?.unit) || 'pcs';
        const qty = (unitField?.value && (unitField.value as any).qty) || 1;

        if (!fallback[name]) {
          fallback[name] = { name, totalQty: 0, unit, items: [] };
        }
        fallback[name].totalQty += qty;
        fallback[name].items.push({
          slug: it.slug,
          qty,
          batch: it.batch?.batchCode,
          fieldValues: it.fieldValues.map((fv: any) => ({
            fieldId: fv.fieldId,
            name: fv.field?.name,
            value: fv.value
          }))
        });
      });
      return Object.values(fallback);
    }

    return result;
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
