import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import * as pdfReader from 'pdfreader';
import { PDFDocument } from 'pdf-lib';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);
  private supabaseAdmin;

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase configuration missing (URL or Key)');
    }

    this.supabaseAdmin = createClient(supabaseUrl || '', supabaseKey || '');
  }

  async processMasterPdf(file: Express.Multer.File, batchData: any) {
    const { clientName, periodStart, periodEnd, label } = batchData;
    this.logger.log(`Starting precision 1-page splitting for ${clientName}`);

    const pdfBuffer = file.buffer;
    
    // Create the batch record
    const batch = await this.prisma.storageBatch.create({
      data: {
        client_name: clientName,
        period_start: periodStart ? new Date(periodStart) : null,
        period_end: periodEnd ? new Date(periodEnd) : null,
        label: label,
      },
    });

    const sourcePdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = sourcePdfDoc.getPageCount();
    const results = [];

    // Process each page individually
    for (let i = 0; i < totalPages; i++) {
      const pageNumber = i + 1;
      try {
        // Extract this single page to a new PDF
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(sourcePdfDoc, [i]);
        singlePagePdf.addPage(copiedPage);
        const pageBytes = await singlePagePdf.save();

        // Scan this specific page for IDs
        const idsOnPage = await this.scanSinglePageForIds(pageBytes);
        
        if (idsOnPage.length === 0) {
          this.logger.warn(`No ID found on page ${pageNumber}, skipping.`);
          continue;
        }

        // For each ID found on this page, upload/map it
        for (const employeeId of idsOnPage) {
          const fileName = `${employeeId}_p${pageNumber}_${Date.now()}.pdf`;
          const filePath = `${batch.id}/${fileName}`;

          // Upload to Supabase
          const { error: uploadError } = await this.supabaseAdmin
            .storage
            .from('payroll-documents')
            .upload(filePath, pageBytes, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = this.supabaseAdmin
            .storage
            .from('payroll-documents')
            .getPublicUrl(filePath);

          const employee = await this.prisma.user.findFirst({
            where: { sys_id: employeeId }
          });

          await this.prisma.document.create({
            data: {
              batch_id: batch.id,
              user_id: employee?.id || null,
              sys_id: employeeId,
              storage_path: publicUrl,
              file_name: fileName,
              file_type: 'PAYSLIP_PAGE',
            },
          });
          
          results.push({ page: pageNumber, id: employeeId, status: 'success' });
        }
      } catch (err) {
        this.logger.error(`Error processing page ${pageNumber}: ${err.message}`);
        results.push({ page: pageNumber, status: 'error', error: err.message });
      }
    }

    return {
      batchId: batch.id,
      totalPages,
      processed: results.length,
      details: results
    };
  }

  async getEmployees() {
    const users = await this.prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      include: {
        documents: {
          select: { batch_id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      sys_id: user.sys_id,
      password: user.password,
      role: user.role,
      run_ids: user.documents.map(d => d.batch_id),
      createdAt: user.createdAt,
    }));
  }

  async getBatches() {
    return this.prisma.storageBatch.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  async getLatestBatch() {
    const batch = await this.prisma.storageBatch.findFirst({
      orderBy: { created_at: 'desc' }
    });
    return batch || null;
  }

  async deleteEmployee(id: string) {
    return this.prisma.user.delete({
      where: { id }
    });
  }

  async syncBulkEmployees(text: string) {
    if (!text) throw new HttpException('No text provided', HttpStatus.BAD_REQUEST);

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const validEntries = [];

    for (const line of lines) {
      const match = line.match(/^(CSC-[\d-]+)\s+(.+)$/i);
      if (match) {
        const sys_id = match[1].toUpperCase();
        const fullName = match[2].trim();
        
        const nameParts = fullName.split(',').map(p => p.trim());
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFirstTwo = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 2);
        
        const idSuffix = sys_id.split('-').pop() || '';
        const username = `${cleanLast}${cleanFirstTwo}${idSuffix}`;
        
        validEntries.push({
          sys_id,
          fullName,
          username,
          password: sys_id
        });
      }
    }

    let successCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < validEntries.length; i += batchSize) {
      const batch = validEntries.slice(i, i + batchSize);
      
      await this.prisma.$transaction(
        batch.map(entry => 
          this.prisma.user.upsert({
            where: { sys_id: entry.sys_id },
            update: { 
              fullName: entry.fullName, 
              username: entry.username, 
              password: entry.password 
            },
            create: {
              sys_id: entry.sys_id,
              fullName: entry.fullName,
              username: entry.username,
              password: entry.password,
              role: 'EMPLOYEE'
            }
          })
        )
      );
      
      successCount += batch.length;
    }

    return {
      success: true,
      count: successCount,
      message: `Successfully provisioned ${successCount} accounts.`
    };
  }

  async getEmployeePayslips(sysId: string) {
    return this.prisma.document.findMany({
      where: { sys_id: sysId },
      include: {
        batch: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  private async scanSinglePageForIds(buffer: Buffer): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const ids: string[] = [];
      
      new pdfReader.PdfReader().parseBuffer(buffer, (err, item) => {
        if (err) return reject(err);
        if (!item) return resolve([...new Set(ids)]);

        if (item.text) {
          const match = item.text.match(/CSC-[\d-]+/i);
          if (match) {
            ids.push(match[0].toUpperCase());
          }
        }
      });
    });
  }
}
