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

  async processMasterPdf(pdfBuffer: Buffer, batchData: any) {
    const { clientName, periodStart, periodEnd, label, remark, releaseDate, resumeBatchId } = batchData;
    this.logger.log(`Starting precision 1-page splitting for ${clientName}${resumeBatchId ? ` (RESUMING batch: ${resumeBatchId})` : ''}`);
    
    let batch;
    if (resumeBatchId) {
      batch = await this.prisma.storageBatch.findUnique({
        where: { id: resumeBatchId }
      });
      if (!batch) {
        throw new HttpException('Batch to resume not found', HttpStatus.NOT_FOUND);
      }
      this.logger.log(`Resuming batch ${batch.id}. Will skip already processed documents.`);
    } else {
      // Create the batch record
      batch = await this.prisma.storageBatch.create({
        data: {
          client_name: clientName,
          period_start: periodStart ? new Date(periodStart) : null,
          period_end: periodEnd ? new Date(periodEnd) : null,
          release_date: releaseDate ? new Date(releaseDate) : null,
          label: label,
          remark: remark || null,
        },
      });
    }

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
        const idsOnPage = await this.scanSinglePageForIds(Buffer.from(pageBytes));
        
        if (idsOnPage.length === 0) {
          this.logger.warn(`No ID found on page ${pageNumber}, skipping.`);
          continue;
        }

        // For each ID found on this page, upload/map it
        for (const employeeId of idsOnPage) {
          if (resumeBatchId) {
            const existingDoc = await this.prisma.document.findFirst({
              where: {
                batch_id: batch.id,
                sys_id: employeeId
              }
            });

            if (existingDoc) {
              this.logger.log(`Page ${pageNumber}: ID ${employeeId} already exists in batch ${batch.id}. Skipping.`);
              results.push({ page: pageNumber, id: employeeId, status: 'skipped' });
              continue;
            }
          }

          const fileName = `${employeeId}_p${pageNumber}_${Date.now()}.pdf`;
          const filePath = `documents/${batch.id}/${fileName}`;

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
            where: { 
              sys_id: employeeId,
              ...(label ? { company_label: label } : {})
            }
          });

          await this.prisma.document.create({
            data: {
              batch_id: batch.id,
              user_id: employee?.id || null,
              sys_id: employeeId,
              storage_path: publicUrl,
              file_name: fileName,
              file_type: 'PAYSLIP_PAGE',
              remark: remark || null,
            },
          });
          
          results.push({ page: pageNumber, id: employeeId, status: 'success' });
        }
      } catch (err) {
        this.logger.error(`Error processing page ${pageNumber}: ${err.message}`);
        results.push({ page: pageNumber, status: 'error', error: err.message });
        
        // If the batch was deleted mid-processing, stop to prevent orphaned files
        if (err.message && err.message.includes('Foreign key constraint') && err.message.includes('batch_id')) {
          this.logger.warn(`Batch ${batch.id} was deleted mid-processing. Aborting remaining pages.`);
          break;
        }
      }
    }

    return {
      batchId: batch.id,
      totalPages,
      processed: results.length,
      details: results
    };
  }

  async reviseDocuments(batchId: string, selectedSysIds: string[], remark: string, fileBuffer: Buffer) {
    const batch = await this.prisma.storageBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('Batch not found');

    const pdfDoc = await PDFDocument.load(fileBuffer);
    const numPages = pdfDoc.getPageCount();
    let revisedCount = 0;

    for (let i = 0; i < numPages; i++) {
      try {
        const singlePageDoc = await PDFDocument.create();
        const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
        singlePageDoc.addPage(copiedPage);
        const singlePageBytes = await singlePageDoc.save();

        const ids = await this.scanSinglePageForIds(Buffer.from(singlePageBytes));
        const targetSysId = ids.find(id => selectedSysIds.includes(id));

        if (targetSysId) {
          const fileName = `${targetSysId}_revised_${Date.now()}.pdf`;
          const storagePath = `documents/${batchId}/${fileName}`;
          
          const { error } = await this.supabaseAdmin.storage
            .from('payroll-documents')
            .upload(storagePath, singlePageBytes, { contentType: 'application/pdf', upsert: true });

          if (error) throw new Error(`Supabase upload failed: ${error.message}`);

          const publicUrl = this.supabaseAdmin.storage.from('payroll-documents').getPublicUrl(storagePath).data.publicUrl;

          const existingDocs = await this.prisma.document.findMany({
            where: { batch_id: batchId, sys_id: targetSysId }
          });
          
          if (existingDocs.length > 0) {
            await this.prisma.document.updateMany({
              where: { batch_id: batchId, sys_id: targetSysId },
              data: {
                storage_path: publicUrl,
                file_name: fileName,
                remark: remark || 'Revised Document',
                created_at: new Date()
              }
            });
          } else {
             const employee = await this.prisma.user.findUnique({ where: { sys_id: targetSysId } });
             await this.prisma.document.create({
                data: {
                  batch_id: batchId,
                  user_id: employee?.id || null,
                  sys_id: targetSysId,
                  storage_path: publicUrl,
                  file_name: fileName,
                  file_type: 'PAYSLIP_PAGE',
                  remark: remark || 'Revised Document'
                }
             });
          }
          revisedCount++;
        }
      } catch (err) {
         this.logger.error(`Error processing revision page ${i}: ${err.message}`);
      }
    }

    return { success: true, count: revisedCount };
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
      company_label: user.company_label,
    }));
  }

  async portalLogin(username: string, pass: string) {
    const cleanUsername = username.toLowerCase().trim();
    const cleanPass = pass.trim();

    console.log(`[Portal Login] Attempt: username='${cleanUsername}', pass='${cleanPass}'`);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { sys_id: { equals: cleanUsername, mode: 'insensitive' } }
        ],
        role: 'EMPLOYEE'
      }
    });

    if (!user) {
      console.log(`[Portal Login] User not found for username/sys_id: ${cleanUsername}`);
      throw new HttpException('Invalid username or password.', HttpStatus.UNAUTHORIZED);
    }

    if (user.password.trim().toLowerCase() !== cleanPass.toLowerCase()) {
      console.log(`[Portal Login] Password mismatch for ${cleanUsername}. DB password: '${user.password}'`);
      throw new HttpException('Invalid username or password.', HttpStatus.UNAUTHORIZED);
    }

    console.log(`[Portal Login] Success for user: ${user.sys_id}`);

    return {
      id: user.id,
      sys_id: user.sys_id,
      fullName: user.fullName,
      username: user.username,
      role: user.role
    };
  }

  async deleteBatch(batchId: string) {
    const batch = await this.prisma.storageBatch.findUnique({
      where: { id: batchId }
    });

    if (!batch) {
      throw new HttpException('Batch not found', HttpStatus.NOT_FOUND);
    }

    const folderPath = `documents/${batchId}`;
    let hasMore = true;
    const limit = 500;

    while (hasMore) {
      const { data: filesList, error: listError } = await this.supabaseAdmin
        .storage
        .from('payroll-documents')
        .list(folderPath, { limit, offset: 0 });

      if (listError || !filesList || filesList.length === 0) {
        hasMore = false;
        break;
      }

      const validFiles = filesList.filter(f => f.name !== '.emptyFolderPlaceholder');
      if (validFiles.length > 0) {
        const filePaths = validFiles.map(f => `${folderPath}/${f.name}`);
        const chunkSize = 100;
        for (let i = 0; i < filePaths.length; i += chunkSize) {
          const chunk = filePaths.slice(i, i + chunkSize);
          const { error } = await this.supabaseAdmin
            .storage
            .from('payroll-documents')
            .remove(chunk);
            
          if (error) {
             this.logger.error(`Error deleting chunk from storage: ${error.message}`);
          }
        }
      }

      // If we only got empty placeholders or nothing valid left, we break
      if (validFiles.length === 0) {
        hasMore = false;
      }
    }

    await this.prisma.document.deleteMany({
      where: { batch_id: batchId }
    });

    await this.prisma.storageBatch.delete({
      where: { id: batchId }
    });

    return { success: true, message: `Batch ${batchId} deleted successfully.` };
  }

  async getBatches() {
    return this.prisma.storageBatch.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { documents: true }
        }
      }
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

  async syncBulkEmployees(text: string, label?: string) {
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
    let newCount = 0;
    let updateCount = 0;

    for (const entry of validEntries) {
      try {
        const existing = await this.prisma.user.findUnique({
          where: { sys_id: entry.sys_id }
        });

        if (existing) {
          await this.prisma.user.update({
            where: { sys_id: entry.sys_id },
            data: { 
              fullName: entry.fullName, 
              username: entry.username, 
              password: entry.password,
              company_label: label,
            }
          });
          updateCount++;
        } else {
          await this.prisma.user.create({
            data: {
              sys_id: entry.sys_id,
              fullName: entry.fullName,
              username: entry.username,
              password: entry.password,
              role: 'EMPLOYEE',
              company_label: label,
            }
          });
          newCount++;
        }
        successCount++;
      } catch (err) {
        console.error('Failed to sync user', entry.sys_id, err);
      }
    }

    return {
      success: true,
      count: successCount,
      newCount,
      message: `Successfully provisioned ${successCount} accounts. ${newCount > 0 ? `New: ${newCount}.` : ''}`
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

  async getAllPayslips() {
    return this.prisma.document.findMany({
      include: {
        batch: true,
        user: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getSignedUploadUrl(fileName: string) {
    const filePath = `temp-uploads/${Date.now()}-${fileName}`;
    const { data, error } = await this.supabaseAdmin
      .storage
      .from('payroll-documents')
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      filePath: filePath
    };
  }

  async processRemoteMasterPdf(remotePath: string, batchData: any) {
    this.logger.log(`Downloading remote PDF from Supabase: ${remotePath}`);
    const { data, error: downloadError } = await this.supabaseAdmin
      .storage
      .from('payroll-documents')
      .download(remotePath);

    if (downloadError) {
      this.logger.error(`Failed to download remote PDF: ${downloadError.message}`);
      throw downloadError;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    
    try {
      const result = await this.processMasterPdf(buffer, batchData);
      
      // Clean up temp file
      this.logger.log(`Cleaning up remote PDF: ${remotePath}`);
      await this.supabaseAdmin
        .storage
        .from('payroll-documents')
        .remove([remotePath]);
        
      return result;
    } catch (err) {
      this.logger.error(`Error processing remote PDF: ${err.message}`);
      // Also cleanup on error
      await this.supabaseAdmin
        .storage
        .from('payroll-documents')
        .remove([remotePath]);
      throw err;
    }
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

  async saveCompany(name: string) {
    if (!name) throw new HttpException('Company name is required', HttpStatus.BAD_REQUEST);
    const cleanName = name.trim().toUpperCase();
    
    return this.prisma.company.upsert({
      where: { name: cleanName },
      update: {},
      create: { name: cleanName }
    });
  }

  async getCompanies() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async deleteCompany(id: string) {
    return this.prisma.company.delete({
      where: { id }
    });
  }
}
