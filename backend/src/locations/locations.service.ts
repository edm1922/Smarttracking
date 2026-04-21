import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.location.findUnique({ where: { id } });
  }

  create(data: { name: string; description?: string }) {
    return this.prisma.location.create({ data });
  }

  update(id: string, data: { name: string; description?: string }) {
    return this.prisma.location.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.location.delete({ where: { id } });
  }
}
