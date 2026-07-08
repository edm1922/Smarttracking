
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RsqService {
  constructor(private prisma: PrismaService) {}

  // --- Fabrics ---
  async getFabrics() {
    return this.prisma.fabric.findMany({
      include: {
        transactions: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFabric(id: string) {
    return this.prisma.fabric.findUnique({
      where: { id },
      include: { transactions: true },
    });
  }

  async createFabric(data: { name: string; type: string; color?: string; unit: string; unitPrice: number }) {
    return this.prisma.fabric.create({
      data,
    });
  }

  // --- Tailors ---
  async getTailors() {
    return this.prisma.tailor.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createTailor(data: { name: string; address?: string; contactPerson?: string; contactNumber?: string }) {
    return this.prisma.tailor.create({
      data,
    });
  }

  // --- Apparels ---
  async getApparels() {
    return this.prisma.apparel.findMany({
      include: { fabric: true },
      orderBy: { name: 'asc' },
    });
  }

  async createApparel(data: { name: string; fabricId?: string }) {
    return this.prisma.apparel.create({
      data: {
        name: data.name.toUpperCase().trim(),
        fabricId: data.fabricId || null,
      },
    });
  }

  async updateApparel(id: string, data: { name?: string; fabricId?: string | null }) {
    const existing = await this.prisma.apparel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Apparel not found');

    return this.prisma.apparel.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.toUpperCase().trim() }),
        ...(data.fabricId !== undefined && { fabricId: data.fabricId }),
      },
    });
  }

  async deleteApparel(id: string) {
    const existing = await this.prisma.apparel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Apparel not found');

    return this.prisma.apparel.delete({
      where: { id },
    });
  }

  async seedApparels() {
    const fabrics = await this.prisma.fabric.findMany();

    const normalizeFabricName = (name: string) => {
      if (!name) return '';
      let n = name.trim().toUpperCase();
      n = n.replace('APHAGINA', 'ALPHAGINA');
      n = n.replace('ALPAGINA', 'ALPHAGINA');
      n = n.replace('LAVANDER', 'LAVENDER');
      n = n.replace('SKYBLUE', 'SKY BLUE');
      return n;
    };

    const APPAREL_MAP: Record<string, string> = {
      "HOODCAP- YELLOW (KATRINA)": "KATRINA - YELLOW",
      "PANTS (LARGE) - KATRINA": "KATRINA - NAVY BLUE",
      "TRAPAL- TRANSPARENT": "TRAPAL- TRANSPARENT",
      "HOODCAP YELLOW WITH GREEN BAND (KATRINA)": "KATRINA - YELLOW",
      "HOODCAP YELLOW WITH ORANGE BAND (KATRINA)": "KATRINA - YELLOW",
      "HOODCAP- YELLOW W/ BLUE BAND (KATRINA)": "KATRINA - YELLOW",
      "HAIRNET WHITE (SOFTULE)": "SOFT TULE - WHITE",
      "PANTS MEDIUM- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
      "PANTS LARGE- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
      "SMOCKGOWN- YELLOW (ALPAGINA)": "ALPHAGINA - YELLOW",
      "SMOCK GOWN- PINK (ALPHAGINA)": "ALPHAGINA - PINK",
      "HOODCAP- PINK (KATRINA)": "KATRINA - PINK",
      "BULLCAP- ORANGE (KATRINA)": "KATRINA - ORANGE",
      "BULLCAP- RED (KATRINA)": "KATRINA - RED",
      "SMOCK GOWN - PINK (ALPHAGINA)": "ALPHAGINA - PINK",
      "MASK- WHITE (KATRINA)": "KATRINA - WHITE",
      "HOOD CAP - ORANGE (KATRINA)": "KATRINA - ORANGE",
      "SMOCK GOWN- ORANGE (ALPHAGINA)": "ALPHAGINA - ORANGE",
      "PANTS LARGE - NAVY BLUE KATRINA": "KATRINA - NAVY BLUE",
      "PANTS (MEDIUM) - KATRINA": "KATRINA - NAVY BLUE",
      "PANTS SMALL- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
      "SMOCK GOWN - LAVANDER (ALPHAGINA)": "ALPHAGINA - LAVENDER",
      "HOOD CAP - LAVANDER (KATRINA)": "KATRINA - LAVANDER",
      "BULLCAP - YELLOW (KATRINA)": "KATRINA - YELLOW",
      "BULLCAP- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
      "BULLCAP- VIOLET (KATRINA)": "KATRINA - VIOLET",
      "HOODCAP- ORANGE W/YELLOW BAND (KATRINA)": "KATRINA - ORANGE",
      "SMOCK GOWN - BROWN (ALPHAGINA)": "ALPHAGINA - BROWN",
      "HOOD CAP - BROWN (KATRINA)": "KATRINA - BROWN",
      "APRON- SKY BLUE (KATRINA)": "KATRINA - SKY BLUE",
      "BULLCAP- MAROON (KATRINA)": "KATRINA - MAROON",
      "BULLCAP- APPLE GREEN (KATRINA)": "KATRINA - APPLE GREEN",
    };

    let seeded = 0;

    for (const [apparelName, targetFabricName] of Object.entries(APPAREL_MAP)) {
      const existing = await this.prisma.apparel.findUnique({
        where: { name: apparelName },
      });

      if (existing) continue;

      let fabricId: string | null = null;
      const matchingFabric = fabrics.find(
        (f) => normalizeFabricName(f.name) === normalizeFabricName(targetFabricName),
      );
      if (matchingFabric) fabricId = matchingFabric.id;

      await this.prisma.apparel.create({
        data: { name: apparelName, fabricId },
      });
      seeded++;
    }

    return { seeded, total: Object.keys(APPAREL_MAP).length };
  }

  // --- Transactions ---
  async getTransactions(params?: { fabricId?: string }) {
    return this.prisma.fabricTransaction.findMany({
      where: params?.fabricId ? { fabricId: params.fabricId } : {},
      include: { fabric: true },
      orderBy: { date: 'desc' },
    });
  }

  async createFabricTransaction(data: {
    fabricId: string;
    type: string;
    quantity: number;
    remarks?: string;
    location?: string;
    date?: Date;
  }) {
    const fabric = await this.prisma.fabric.findUnique({ where: { id: data.fabricId } });
    if (!fabric) throw new NotFoundException('Fabric not found');

    const count = await this.prisma.fabricTransaction.count();
    const transactionNo = `TRN-${Date.now()}-${count}`;

    return this.prisma.fabricTransaction.create({
      data: {
        transactionNo,
        fabricId: data.fabricId,
        type: data.type,
        quantity: data.quantity,
        unit: fabric.unit,
        remarks: data.remarks,
        location: data.location || 'BODEGA',
        date: data.date || new Date(),
      },
    });
  }

  // --- Tailoring Requests (RSQ) ---
  async getRequests() {
    return this.prisma.tailoringRequest.findMany({
      include: {
        fabric: true,
        tailor: true,
        product: true,
      },
      orderBy: { rsqNo: 'desc' },
    });
  }

  async generateNextRsqNo() {
    const lastRequest = await this.prisma.tailoringRequest.findFirst({
      where: { rsqNo: { startsWith: 'RSQ-' } },
      orderBy: { rsqNo: 'desc' },
    });

    if (!lastRequest) return 'RSQ-00588'; // Start after the Excel migration point

    const lastNo = parseInt(lastRequest.rsqNo.replace('RSQ-', ''));
    const nextNo = lastNo + 1;
    return `RSQ-${String(nextNo).padStart(5, '0')}`;
  }

  async createRequest(data: {
    productId?: string;
    fabricId?: string;
    tailorId: string;
    quantityOrdered: number;
    targetDate?: Date;
    remarks?: string;
  }) {
    const rsqNo = await this.generateNextRsqNo();

    return this.prisma.tailoringRequest.create({
      data: {
        rsqNo,
        productId: data.productId,
        fabricId: data.fabricId,
        tailorId: data.tailorId,
        quantityOrdered: data.quantityOrdered,
        targetDate: data.targetDate,
        remarks: data.remarks,
        status: 'PENDING',
      },
    });
  }

  async updateRequestStatus(id: string, status: string, quantityReceived?: number) {
    const updateData: any = { status };
    if (quantityReceived !== undefined) {
      updateData.quantityReceived = quantityReceived;
    }

    return this.prisma.tailoringRequest.update({
      where: { id },
      data: updateData,
    });
  }

  async getNextSequences() {
    // 1. Calculate Next Transaction #
    // Find the latest FabricTransaction starting with 'T-'
    const lastTx = await this.prisma.fabricTransaction.findFirst({
      where: {
        transactionNo: {
          startsWith: 'T-',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextTransactionNo = 'T-2026-27'; // Default start after Excel migration point (T-2026-26)
    if (lastTx) {
      const parts = lastTx.transactionNo.split('_');
      const batchCode = parts[0]; // e.g. 'T-2026-26'
      
      const match = batchCode.match(/T-(\d+)-(\d+)/);
      if (match) {
        const year = parseInt(match[1]);
        const seq = parseInt(match[2]);
        nextTransactionNo = `T-${year}-${seq + 1}`;
      } else {
        const simpleMatch = batchCode.match(/T-(\d+)/);
        if (simpleMatch) {
          const seq = parseInt(simpleMatch[1]);
          nextTransactionNo = `T-${seq + 1}`;
        }
      }
    }

    // 2. Calculate Next RSQ #
    const nextRsqNo = await this.generateNextRsqNo();

    // 3. Today's Series Sequence
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.prisma.fabricTransaction.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const month = today.getMonth() + 1; // 1-indexed
    const day = today.getDate();
    const todaySeriesSequence = `${month}.${day}.${todayCount + 1}`;

    return {
      nextTransactionNo,
      nextRsqNo,
      todaySeriesSequence,
    };
  }

  async createBatchTransactions(items: Array<{
    transactionNo: string;
    seriesNo: string;
    rsqNo?: string;
    fabricId: string;
    type: string;
    quantity: number;
    remarks?: string;
    applicableMonth: string;
    date?: string;
    tailorId?: string;
    apparelName?: string;
  }>) {
    const createdTransactions = [];

    for (const item of items) {
      const fabric = await this.prisma.fabric.findUnique({ where: { id: item.fabricId } });
      if (!fabric) throw new NotFoundException(`Fabric not found: ${item.fabricId}`);

      // Combine Transaction No and Series No (T-2026-26_5.15.7)
      const dbTxNo = `${item.transactionNo}_${item.seriesNo}`;

      // Package remarks with RSQ, applicable month, and apparelName info
      const dbRemarks = `RSQ: ${item.rsqNo || '—'} | Month: ${item.applicableMonth || '—'} | Apparel: ${item.apparelName || '—'} | Remarks: ${item.remarks || ''}`;

      // Create fabric transaction
      const tx = await this.prisma.fabricTransaction.create({
        data: {
          transactionNo: dbTxNo,
          fabricId: item.fabricId,
          type: item.type,
          quantity: item.quantity,
          unit: fabric.unit,
          remarks: dbRemarks,
          location: 'BODEGA',
          date: item.date ? new Date(item.date) : new Date(),
        },
      });

      // If withdrawal or return (associated with an RSQ), manage TailoringRequest
      if (item.rsqNo && (item.type === 'WITHDRAWAL' || item.type === 'RETURN')) {
        const existingRequest = await this.prisma.tailoringRequest.findUnique({
          where: { rsqNo: item.rsqNo }
        });

        let targetTailorId = item.tailorId;
        if (!targetTailorId) {
          const tailors = await this.prisma.tailor.findMany({ take: 1 });
          if (tailors.length > 0) {
            targetTailorId = tailors[0].id;
          } else {
            const placeholderTailor = await this.prisma.tailor.create({
              data: { name: 'UNASSIGNED TAILOR', address: 'PLACEHOLDER' }
            });
            targetTailorId = placeholderTailor.id;
          }
        }

        const requestRemarks = item.apparelName || item.remarks || '';

        if (existingRequest) {
          await this.prisma.tailoringRequest.update({
            where: { id: existingRequest.id },
            data: {
              fabricId: item.fabricId,
              tailorId: targetTailorId,
              quantityReceived: item.type === 'RETURN'
                ? Math.max(0, existingRequest.quantityReceived - item.quantity)
                : existingRequest.quantityReceived,
              remarks: requestRemarks || existingRequest.remarks,
            }
          });
        } else {
          await this.prisma.tailoringRequest.create({
            data: {
              rsqNo: item.rsqNo,
              fabricId: item.fabricId,
              tailorId: targetTailorId,
              quantityOrdered: item.quantity,
              quantityReceived: 0,
              unit: 'pcs',
              orderDate: item.date ? new Date(item.date) : new Date(),
              status: 'PENDING',
              remarks: requestRemarks,
            }
          });
        }
      }

      createdTransactions.push(tx);
    }

    return createdTransactions;
  }

  async updateTransaction(id: string, data: {
    fabricId?: string;
    type?: string;
    quantity?: number;
    unit?: string;
    remarks?: string;
    location?: string;
    date?: Date;
  }) {
    const existing = await this.prisma.fabricTransaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Transaction not found');

    return this.prisma.fabricTransaction.update({
      where: { id },
      data: {
        ...(data.fabricId !== undefined && { fabricId: data.fabricId }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
      },
    });
  }

  async deleteTransactions(ids: string[]) {
    return this.prisma.fabricTransaction.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }
}

