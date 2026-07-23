import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransmittalsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.transmittal.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.transmittal.findUnique({ where: { id } });
  }

  async getNextTransmittalNo() {
    const all = await this.prisma.transmittal.findMany({
      select: { transmittalNo: true },
    });

    const numbers = all
      .map((t) => parseInt(t.transmittalNo.replace(/\D/g, '')))
      .filter((n) => !isNaN(n));

    const maxNo = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNo = (maxNo + 1).toString().padStart(6, '0');
    return `TR-${nextNo}`;
  }

  async create(data: any) {
    const autoNo = await this.getNextTransmittalNo();
    return this.prisma.transmittal.create({
      data: {
        ...data,
        transmittalNo: autoNo,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }

  update(id: string, data: any) {
    return this.prisma.transmittal.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.transmittal.delete({ where: { id } });
  }
}
