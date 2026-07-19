import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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
      // O(1) OPTIMIZATION: UUID-based slug generation (collision-free)
      let slug = `TEL-${randomUUID().substring(0, 8).toUpperCase()}`;
      
      // Single existence check (defensive, collisions are extremely rare with UUID)
      const existing = await this.prisma.item.findUnique({ where: { slug } });
      if (existing) {
        // Fallback to random string only if UUID collides (near impossible)
        let isUnique = false;
        while (!isUnique) {
          const randomStr = Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase();
          slug = `TEL-${randomStr}`;
          const existingCheck = await this.prisma.item.findUnique({ where: { slug } });
          if (!existingCheck) isUnique = true;
        }
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

      // Extract quantity for audit logs if it's a unit tracking item
      const unitValue = fieldValues?.find((fv: any) => fv.value?.useUnitQty)?.value;
      const logQuantity = unitValue?.qty || 1;

      await this.logsService.create({
        userId,
        itemId: item.id,
        action: 'CREATE_ITEM',
        changes: { name: item.name, quantity: logQuantity },
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

    if (item.locked && userRole !== 'admin' && userRole !== 'inventory' && userRole !== 'staff') {
      throw new BadRequestException('Item is locked. Only authorized staff can edit details.');
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

    // Auto-detect stock movement from unit-tracking field qty changes
    try {
      const oldUnitField = item.fieldValues?.find((fv: any) => fv.value && typeof fv.value === 'object' && (fv.value as any).useUnitQty);
      const newFieldValuesPayload = data.fieldValues || [];
      const newUnitField = newFieldValuesPayload.find((fv: any) => fv.value?.useUnitQty);

      if (newUnitField || oldUnitField) {
        const oldQty = oldUnitField ? Number((oldUnitField.value as any).qty) || 0 : 0;
        const newQty = newUnitField ? Number(newUnitField.value.qty) || 0 : 0;
        const qtyDiff = newQty - oldQty;

        if (!oldUnitField && newUnitField && newQty > 0) {
          await this.prisma.activityLog.updateMany({
            where: { itemId: item.id, action: 'CREATE_ITEM' },
            data: { changes: { name: item.name, quantity: newQty } },
          });
          await this.logsService.create({
            userId,
            itemId: item.id,
            action: 'STOCK_IN',
            changes: { quantity: newQty },
          });
        } else if (qtyDiff !== 0) {
          const type = qtyDiff > 0 ? 'IN' : 'OUT';
          const absDiff = Math.abs(qtyDiff);
          await this.logsService.create({
            userId,
            itemId: item.id,
            action: `STOCK_${type}`,
            changes: { quantity: absDiff },
          });
        }
      }
    } catch (err) {
      console.error('Auto stock detection failed:', err.message);
    }

    // Auto-detect stock movement from unit-tracking field qty changes
    try {
      const oldUnitField = item.fieldValues?.find((fv: any) => fv.value && typeof fv.value === 'object' && (fv.value as any).useUnitQty);
      const newFieldValuesPayload = data.fieldValues || [];
      const newUnitField = newFieldValuesPayload.find((fv: any) => fv.value?.useUnitQty);

      if (newUnitField || oldUnitField) {
        const oldQty = oldUnitField ? Number((oldUnitField.value as any).qty) || 0 : 0;
        const newQty = newUnitField ? Number(newUnitField.value.qty) || 0 : 0;
        const qtyDiff = newQty - oldQty;

        if (qtyDiff !== 0) {
          const type = qtyDiff > 0 ? 'IN' : 'OUT';
          const absDiff = Math.abs(qtyDiff);
          await this.logsService.create({
            userId,
            itemId: item.id,
            action: `STOCK_${type}`,
            changes: { quantity: absDiff },
          });
        }
      }
    } catch (err) {
      console.error('Auto stock detection failed:', err.message);
    }

    return updatedItem;
  }

  async getUnitInventory(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 100, search } = params;

    // Fetch ALL items that match the unit tracking criteria
    // We do this because we need to group them by name first before we can reliably paginate or search by group name
    const where: any = {
      fieldValues: {
        some: {
          value: {
            path: ['useUnitQty'],
            equals: true
          }
        }
      }
    };

    // If there is a search term, we'll apply it to items first
    // but the actual filtering of the groups will happen in JS to be more robust
    const items = await this.prisma.item.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        batch: { select: { batchCode: true } },
        fieldValues: {
          select: {
            fieldId: true,
            value: true,
            field: { select: { name: true } }
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    const groupsMap = new Map<string, { name: string, totalQty: number, unit: string, rawItems: any[] }>();
    
    items.forEach(item => {
      // Skip items with no name (they are part of TELA batch but not individual products)
      if (!item.name) return;
      
      const unitField = item.fieldValues.find(fv => {
        const val = fv.value as any;
        return val && typeof val === 'object' && val.useUnitQty === true;
      });
      
      if (!unitField) return;
      
      const name = item.name;
      const qty = (unitField.value as any).qty || 0;
      
      if (!groupsMap.has(name)) {
        groupsMap.set(name, {
          name,
          totalQty: 0,
          unit: (unitField.value as any).unit || 'Units',
          rawItems: []
        });
      }
      
      const group = groupsMap.get(name)!;
      group.totalQty += qty;
      group.rawItems.push(item);
    });

    let allGroups = Array.from(groupsMap.values());

    // Apply search filtering in JS for better matching across products and item slugs
    if (search) {
      const searchLower = search.toLowerCase();
      allGroups = allGroups.filter(group => {
        if (group.name.toLowerCase().includes(searchLower)) return true;
        return group.rawItems.some(it => {
          if (it.slug.toLowerCase().includes(searchLower)) return true;
          return it.fieldValues.some((fv: any) => {
            const v = fv.value;
            const valStr = typeof v === 'object' ? String(v?.main || JSON.stringify(v)) : String(v);
            return valStr.toLowerCase().includes(searchLower);
          });
        });
      });
    }

    const total = allGroups.length;
    
    // Apply pagination BEFORE expanding the heavy JSON payloads
    const paginatedGroups = allGroups.slice(skip, skip + take);

    // Fetch thresholds for the paginated subset
    const productNames = paginatedGroups.map(g => g.name);
    const products = await this.prisma.product.findMany({
      where: { name: { in: productNames } },
      select: { name: true, threshold: true }
    });
    const productMap = new Map(products.map(p => [p.name, p.threshold]));

    // Format ONLY the paginated results
    let result = paginatedGroups.map(group => {
      const formattedSpecs: Record<string, Set<string>> = {};
      const formattedItems = group.rawItems.map(item => {
        
        // Build specs dynamically
        item.fieldValues.forEach((fv: any) => {
          const v = fv.value as any;
          let displayValue: string | null = null;
          if (v && typeof v === 'object') {
            displayValue = String(v.main ?? v.qty ?? JSON.stringify(v));
          } else {
            displayValue = String(fv.value);
          }
          if (displayValue && displayValue.trim() !== '') {
            const fieldName = fv.field?.name || 'Unknown Field';
            if (!formattedSpecs[fieldName]) {
              formattedSpecs[fieldName] = new Set();
            }
            formattedSpecs[fieldName].add(displayValue.trim());
          }
        });
        
        return {
          slug: item.slug,
          qty: (item.fieldValues.find((fv: any) => (fv.value as any)?.useUnitQty === true)?.value as any)?.qty || 0,
          batch: item.batch?.batchCode,
          status: item.status,
          fieldValues: item.fieldValues.map((fv: any) => ({
            fieldId: fv.fieldId,
            name: fv.field?.name || 'Unknown Field',
            value: fv.value
          }))
        };
      });

      // Convert Set to Array for JSON response
      const specsOutput: Record<string, string[]> = {};
      Object.keys(formattedSpecs).forEach(key => {
        specsOutput[key] = Array.from(formattedSpecs[key]);
      });

      return {
        name: group.name,
        totalQty: group.totalQty,
        unit: group.unit,
        threshold: productMap.get(group.name) ?? 50,
        specs: specsOutput,
        items: formattedItems
      };
    });

    if (result.length === 0 && skip === 0 && !search) {
      // Fallback only if no search and no grouped items found at all
      const fallbackItems = await this.prisma.item.findMany({
        take: 100,
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          batch: { select: { batchCode: true } },
          fieldValues: {
            select: {
              fieldId: true,
              value: true,
              field: { select: { name: true } }
            }
          }
        }
      });
       const fallback: Record<string, any> = {};
      fallbackItems.forEach(it => {
        // Skip items with no name - they should not create "Unnamed Product" groups
        if (!it.name) return;
        
        const name = it.name;
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
      const fallbackResult = Object.values(fallback);
      return { data: fallbackResult.slice(skip, skip + take), total: fallbackResult.length };
    }

    return { data: result, total };
  }

  async getUnitInventorySummary() {
    const stats = await this.prisma.$queryRaw`
      SELECT 
        i."name",
        COUNT(*) as item_count,
        SUM((fv.value->>'qty')::int) as total_qty,
        MAX(fv.value->>'unit') as unit
      FROM "Item" i
      JOIN "ItemFieldValue" fv ON fv."itemId" = i.id
      WHERE fv.value::text LIKE '%useUnitQty%'
      GROUP BY i."name"
      ORDER BY i."name"
      LIMIT 100
    `;
    return stats;
  }

  async submitForm(slug: string, data: any) {
    const item = await this.findOne(slug);
    if (item.locked)
      throw new BadRequestException(
        'This form has already been submitted and is locked.',
      );

    const { fieldValues, name } = data;

    const result = await this.prisma.item.update({
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

    // Use a real user ID for the log (required by foreign key constraint)
    let systemUser = await this.prisma.user.findFirst({ where: { role: 'admin' } });
    if (!systemUser) {
      systemUser = await this.prisma.user.findFirst(); // Fallback to any valid user
    }

    // Auto-detect stock movement from unit-tracking field qty changes
    try {
      const oldUnitField = item.fieldValues?.find((fv: any) => fv.value && typeof fv.value === 'object' && (fv.value as any).useUnitQty);
      const newFieldValuesPayload = data.fieldValues || [];
      const newUnitField = newFieldValuesPayload.find((fv: any) => fv.value?.useUnitQty);

      if (newUnitField || oldUnitField) {
        const oldQty = oldUnitField ? Number((oldUnitField.value as any).qty) || 0 : 0;
        const newQty = newUnitField ? Number(newUnitField.value.qty) || 0 : 0;
        const qtyDiff = newQty - oldQty;

        if (qtyDiff !== 0) {
          const type = qtyDiff > 0 ? 'IN' : 'OUT';
          const absDiff = Math.abs(qtyDiff);
          await this.logsService.create({
            userId: systemUser?.id || '7b026b2a-d53a-486d-9a15-3cc0229e43cf',
            itemId: item.id,
            action: `STOCK_${type}`,
            changes: { quantity: absDiff },
          });
        }
      }
    } catch (err) {
      console.error('Auto stock detection failed:', err.message);
    }

    // Log the submission
    const unitValue = fieldValues?.find((fv: any) => fv.value?.useUnitQty)?.value;
    const logQuantity = unitValue?.qty || 1;
    const logUnit = unitValue?.unit || 'Units';
    
    await this.logsService.create({
      userId: systemUser?.id || '7b026b2a-d53a-486d-9a15-3cc0229e43cf', 
      itemId: item.id,
      action: 'SUBMIT_CONTENT',
      changes: { name: name || item.name, quantity: logQuantity, unit: logUnit },
    });

    return result;
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
