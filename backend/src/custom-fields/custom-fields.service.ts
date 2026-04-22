import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customField.findMany({
      include: { batch: true },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findByBatch(batchId?: string) {
    return this.prisma.customField.findMany({
      where: {
        OR: [{ batchId: batchId || null }, { batchId: null }],
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(data: {
    name: string;
    fieldType: string;
    options?: string[];
    required: boolean;
    batchId?: string;
    batchCode?: string;
  }) {
    let finalBatchId = data.batchId || null;

    if (data.batchCode) {
      const batch = await this.prisma.batch.upsert({
        where: { batchCode: data.batchCode },
        update: {},
        create: { batchCode: data.batchCode },
      });
      finalBatchId = batch.id;
    }

    return this.prisma.customField.create({
      data: {
        name: data.name,
        fieldType: data.fieldType,
        options: data.options || [],
        required: data.required,
        batchId: finalBatchId,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      fieldType?: string;
      options?: string[];
      required?: boolean;
      batchId?: string;
      batchCode?: string;
    },
  ) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.fieldType !== undefined) updateData.fieldType = data.fieldType;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.required !== undefined) updateData.required = data.required;

    if (data.batchCode !== undefined) {
      if (data.batchCode) {
        const batch = await this.prisma.batch.upsert({
          where: { batchCode: data.batchCode },
          update: {},
          create: { batchCode: data.batchCode },
        });
        updateData.batchId = batch.id;
      } else {
        updateData.batchId = null;
      }
    } else if (data.batchId !== undefined) {
      updateData.batchId = data.batchId || null;
    }

    return this.prisma.customField.update({
      where: { id },
      data: updateData,
    });
  }

  async reorder(data: { id: string; orderIndex: number }[]) {
    // Perform bulk update in a transaction
    return this.prisma.$transaction(
      data.map((item) =>
        this.prisma.customField.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );
  }

  async remove(id: string) {
    return this.prisma.customField.delete({
      where: { id },
    });
  }
}
