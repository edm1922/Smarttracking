import { Injectable, Logger } from '@nestjs/common';
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
    this.logger.log(`Starting bulk processing for ${clientName} (${periodStart} to ${periodEnd})`);

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

    // 1. Scan the PDF for employee IDs
    const pagesWithIds = await this.scanPdfForIds(pdfBuffer);
    this.logger.log(`Found ${pagesWithIds.length} pages with employee IDs`);

    // 2. Group pages by employee
    const employeeGroups = new Map<string, number[]>();
    pagesWithIds.forEach(({ id, page }) => {
      if (!employeeGroups.has(id)) {
        employeeGroups.set(id, []);
      }
      employeeGroups.get(id)!.push(page);
    });

    // 3. Extract and upload for each employee
    const sourcePdfDoc = await PDFDocument.load(pdfBuffer);
    const results = [];

    for (const [employeeId, pageIndices] of employeeGroups.entries()) {
      try {
        const newPdfDoc = await PDFDocument.create();
        const copiedPages = await newPdfDoc.copyPages(sourcePdfDoc, pageIndices.map(p => p - 1));
        copiedPages.forEach(page => newPdfDoc.addPage(page));
        
        const splitPdfBytes = await newPdfDoc.save();
        const fileName = `${employeeId}_${Date.now()}.pdf`;
        const filePath = `${batch.id}/${fileName}`;

        // Upload to Supabase
        const { error: uploadError } = await this.supabaseAdmin
          .storage
          .from('payroll-documents')
          .upload(filePath, splitPdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = this.supabaseAdmin
          .storage
          .from('payroll-documents')
          .getPublicUrl(filePath);

        // Map to employee in DB
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
            file_type: 'PAYSLIP',
          },
        });
        
        results.push({ id: employeeId, status: employee ? 'success' : 'user_not_found' });
      } catch (err) {
        this.logger.error(`Failed to process employee ${employeeId}: ${err.message}`);
        results.push({ id: employeeId, status: 'error', error: err.message });
      }
    }

    return {
      batchId: batch.id,
      processed: results.length,
      details: results
    };
  }

  private async scanPdfForIds(buffer: Buffer): Promise<{ id: string; page: number }[]> {
    return new Promise((resolve, reject) => {
      const pages: { id: string; page: number }[] = [];
      let currentPage = 0;
      
      new pdfReader.PdfReader().parseBuffer(buffer, (err, item) => {
        if (err) return reject(err);
        if (!item) return resolve(pages);

        if (item.page) {
          currentPage = item.page;
        } else if (item.text) {
          const match = item.text.match(/CSC-[\d-]+/i);
          if (match) {
            const id = match[0].toUpperCase();
            // Avoid duplicate IDs for the same page
            if (!pages.some(p => p.page === currentPage && p.id === id)) {
              pages.push({ id, page: currentPage });
            }
          }
        }
      });
    });
  }
}
