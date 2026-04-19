import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customField.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: { name: string; fieldType: string; options?: string[]; required: boolean }) {
    return this.prisma.customField.create({
      data: {
        name: data.name,
        fieldType: data.fieldType,
        options: data.options || [],
        required: data.required,
      },
    });
  }

  async update(id: string, data: { name?: string; fieldType?: string; options?: string[]; required?: boolean }) {
    return this.prisma.customField.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.customField.delete({
      where: { id },
    });
  }
}
