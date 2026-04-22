import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  findAllStatuses() {
    return this.prisma.status.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        fromTransition: { include: { toStatus: true } },
      },
    });
  }

  createStatus(data: { name: string; orderIndex: number }) {
    return this.prisma.status.create({ data });
  }

  async addTransition(fromStatusId: string, toStatusId: string) {
    return this.prisma.statusTransition.create({
      data: { fromStatusId, toStatusId },
    });
  }

  async removeTransition(id: string) {
    return this.prisma.statusTransition.delete({ where: { id } });
  }

  async getAllowedTransitions(currentStatusId: string) {
    const transitions = await this.prisma.statusTransition.findMany({
      where: { fromStatusId: currentStatusId },
      include: { toStatus: true },
    });
    return transitions.map((t) => t.toStatus);
  }
}
