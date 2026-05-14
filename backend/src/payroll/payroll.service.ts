import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import * as pdfReader from 'pdfreader';
import { PDFDocument } from 'pdf-lib';
import * as bcrypt from 'bcrypt';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);
  private supabaseAdmin;

  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase configuration missing (URL or Key)');
    }

    this.supabaseAdmin = createClient(supabaseUrl || '', supabaseKey || '');
  }

  private activeBatches = new Set<string>();
  private cancelledBatches = new Set<string>();

  private normalizeSysId(id: string): string {
    if (!id) return '';
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (clean.startsWith('CSC')) {
      const numbers = clean.substring(3);
      if (numbers.length > 4) {
        // Format: CSC-XXXX-YYYY (e.g. CSC-1234-567)
        return `CSC-${numbers.substring(0, 4)}-${numbers.substring(4)}`;
      } else if (numbers.length > 0) {
        // Format: CSC-XXXX (e.g. CSC-1001)
        return `CSC-${numbers}`;
      }
      return 'CSC';
    }
    return clean;
  }

  async processMasterPdf(pdfBuffer: Buffer, batchData: any) {
    const { clientName, periodStart, periodEnd, label, remark, releaseDate, resumeBatchId } = batchData;
    this.logger.log(`Starting precision 1-page splitting for ${clientName}${resumeBatchId ? ` (RESUMING batch: ${resumeBatchId})` : ''}`);
    
    let batch;
    if (resumeBatchId) {
      if (this.activeBatches.has(resumeBatchId)) {
        this.logger.warn(`Attempted to resume batch ${resumeBatchId} while it is already processing.`);
        throw new HttpException('This batch is already being processed in the background. Please wait for it to complete.', HttpStatus.CONFLICT);
      }
      
      batch = await this.prisma.storageBatch.findUnique({
        where: { id: resumeBatchId }
      });
      if (!batch) {
        throw new HttpException('Batch to resume not found', HttpStatus.NOT_FOUND);
      }
      this.activeBatches.add(batch.id);
      this.logger.log(`Resuming batch ${batch.id}. Will skip already processed documents.`);
    } else {
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
      this.activeBatches.add(batch.id);
    }

    const sourcePdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = sourcePdfDoc.getPageCount();
    const results: any[] = [];

    try {
      const existingSysIds = new Set<string>();
      if (resumeBatchId) {
        const existingDocs = await this.prisma.document.findMany({
          where: { batch_id: batch.id },
          select: { sys_id: true }
        });
        existingDocs.forEach(d => existingSysIds.add(this.normalizeSysId(d.sys_id)));
        this.logger.log(`Resume: Pre-fetched ${existingSysIds.size} existing employee IDs for batch ${batch.id}`);
      }
  
      const PAGE_CONCURRENCY = 3;
      const userCache = new Map<string, any>();
      
      for (let i = 0; i < totalPages; i += PAGE_CONCURRENCY) {
        if (this.cancelledBatches.has(batch.id)) {
          this.logger.warn(`Batch ${batch.id} was cancelled by user. Stopping processing.`);
          this.cancelledBatches.delete(batch.id);
          break;
        }

        const pageChunk = Array.from({ length: Math.min(PAGE_CONCURRENCY, totalPages - i) }, (_, index) => i + index);
        const docsBatch: any[] = [];
        const idsToLookup = new Set<string>();
        const chunkResults: any[] = [];

        await Promise.all(pageChunk.map(async (pIdx) => {
          const pageNumber = pIdx + 1;
          try {
            const singlePagePdf = await PDFDocument.create();
            const [copiedPage] = await singlePagePdf.copyPages(sourcePdfDoc, [pIdx]);
            singlePagePdf.addPage(copiedPage);
            const pageBytes = await singlePagePdf.save();
    
            const idsOnPage = await this.scanSinglePageForIds(Buffer.from(pageBytes));
            
            if (idsOnPage.length === 0) {
              chunkResults.push({ page: pageNumber, status: 'skipped', reason: 'No ID found' });
              return;
            }
    
            for (let employeeId of idsOnPage) {
              employeeId = this.normalizeSysId(employeeId);
    
              if (existingSysIds.has(employeeId)) {
                chunkResults.push({ page: pageNumber, id: employeeId, status: 'skipped', reason: 'Duplicate' });
                continue;
              }
              
              const fileName = `${employeeId}_p${pageNumber}_${Date.now()}.pdf`;
              const filePath = `documents/${batch.id}/${fileName}`;
    
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

              docsBatch.push({
                batch_id: batch.id,
                sys_id: employeeId,
                storage_path: publicUrl,
                file_name: fileName,
                file_type: 'PAYSLIP_PAGE',
                remark: remark || null,
                pageNumber, // temporary for result tracking
              });
              idsToLookup.add(employeeId);
            }
          } catch (err) {
            this.logger.error(`Error processing page ${pageNumber}: ${err.message}`);
            chunkResults.push({ page: pageNumber, status: 'error', error: err.message });
          }
        }));

        // Batch Database Operations for the chunk
        if (docsBatch.length > 0) {
          try {
            // Lookup users for all IDs in this batch
            const missingIds = Array.from(idsToLookup).filter(id => !userCache.has(id));
            if (missingIds.length > 0) {
              const foundUsers = await this.prisma.user.findMany({
                where: { 
                  sys_id: { in: missingIds },
                  ...(label ? { company_label: label } : {})
                }
              });
              foundUsers.forEach(u => {
                if (u.sys_id) userCache.set(u.sys_id, u.id);
              });
              missingIds.forEach(id => {
                if (!userCache.has(id)) userCache.set(id, null);
              });
            }

            // Prepare for createMany (Prisma doesn't allow extra fields like pageNumber)
            const prismaData = docsBatch.map(({ pageNumber, ...data }) => ({
              ...data,
              user_id: userCache.get(data.sys_id) || null
            }));

            await this.prisma.document.createMany({
              data: prismaData
            });

            docsBatch.forEach(d => {
              existingSysIds.add(this.normalizeSysId(d.sys_id));
              chunkResults.push({ page: d.pageNumber, id: d.sys_id, status: 'success' });
            });
          } catch (dbErr) {
            this.logger.error(`Database error in batch processing: ${dbErr.message}`);
            // Fallback to individual creation if createMany fails (or just log error)
            for (const doc of docsBatch) {
              try {
                await this.prisma.document.create({
                  data: {
                    batch_id: doc.batch_id,
                    sys_id: doc.sys_id,
                    user_id: userCache.get(doc.sys_id) || null,
                    storage_path: doc.storage_path,
                    file_name: doc.file_name,
                    file_type: doc.file_type,
                    remark: doc.remark,
                  }
                });
                existingSysIds.add(this.normalizeSysId(doc.sys_id));
                chunkResults.push({ page: doc.pageNumber, id: doc.sys_id, status: 'success' });
              } catch (indivErr) {
                this.logger.error(`Failed individual fallback for ${doc.sys_id}: ${indivErr.message}`);
                chunkResults.push({ page: doc.pageNumber, status: 'error', error: indivErr.message });
              }
            }
          }
        }

        results.push(...chunkResults);
        
        // Brief pause to allow DB connections to release
        if (i + PAGE_CONCURRENCY < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
  
      const added = results.filter(r => r.status === 'success').length;
      const skipped = results.filter(r => r.status === 'skipped').length;
      const errors = results.filter(r => r.status === 'error').length;
  
      return {
        batchId: batch.id,
        totalPages,
        processed: results.length,
        added,
        skipped,
        errors,
        details: results
      };
    } finally {
      this.activeBatches.delete(batch.id);
      this.logger.log(`Finished processing batch ${batch.id}. Lock released.`);
    }
  }

  getProcessingStatus() {
    return Array.from(this.activeBatches);
  }

  cancelBatchProcessing(batchId: string) {
    if (this.activeBatches.has(batchId)) {
      this.cancelledBatches.add(batchId);
      this.logger.log(`Cancellation requested for batch ${batchId}`);
      return { status: 'Cancelled', message: 'Cancellation requested' };
    }
    return { status: 'Error', message: 'Batch not active' };
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

        const ids = (await this.scanSinglePageForIds(Buffer.from(singlePageBytes))).map(id => this.normalizeSysId(id));
        const targetSysId = ids.find(id => selectedSysIds.map(s => this.normalizeSysId(s)).includes(id));

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
    const cleanUsername = (username || '').toLowerCase().trim();
    const cleanPass = (pass || '').trim();

    console.log(`[Portal Login] Attempt: username='${cleanUsername}', pass='${cleanPass}' (len: ${cleanPass.length})`);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: 'insensitive' } },
          { sys_id: { equals: cleanUsername, mode: 'insensitive' } }
        ],
        role: 'EMPLOYEE'
      }
    });

    if (!user) {
      console.log(`[Portal Login] User not found for username/sys_id: ${cleanUsername}`);
      throw new HttpException('Invalid username or password.', HttpStatus.UNAUTHORIZED);
    }

    const dbPass = (user.password || '').trim();
    let isMatch = false;

    // Support both bcrypt hashes and legacy plain text passwords
    if (dbPass.startsWith('$2a$') || dbPass.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(cleanPass, dbPass);
    } else {
      isMatch = dbPass.toLowerCase() === cleanPass.toLowerCase();
    }

    if (!isMatch) {
      console.log(`[Portal Login] Password mismatch for ${cleanUsername}.`);
      if (!dbPass.startsWith('$2a$') && !dbPass.startsWith('$2b$')) {
        console.log(`- Input: '${cleanPass}' (len: ${cleanPass.length})`);
        console.log(`- DB:    '${dbPass}' (len: ${dbPass.length})`);
      }
      throw new HttpException('Invalid username or password.', HttpStatus.UNAUTHORIZED);
    }

    console.log(`[Portal Login] Success for user: ${user.sys_id}`);

    await this.logsService.create({
      userId: user.id,
      action: 'LOGIN',
      changes: { username: user.username }
    });

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

  async bulkDeleteEmployees(ids: string[]) {
    return this.prisma.user.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }

  async syncBulkEmployees(text: string, label?: string) {
    if (!text) throw new HttpException('No text provided', HttpStatus.BAD_REQUEST);

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const validEntries = [];

    for (const line of lines) {
      const match = line.match(/^(CSC-?[\d-]+)\s+(.+)$/i);
      if (match) {
        const sys_id = this.normalizeSysId(match[1]);
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
          password: sys_id.replace(/-/g, '') 
        });
      }
    }

    if (validEntries.length === 0) {
      return { success: true, count: 0, newCount: 0, message: 'No valid entries found.' };
    }

    // Optimization: Batch lookup existing users
    const allSysIds = validEntries.map(e => e.sys_id);
    const allUsernames = validEntries.map(e => e.username);
    
    const existingUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { sys_id: { in: allSysIds } },
          { username: { in: allUsernames } }
        ]
      }
    });

    const userMap = new Map<string, any>();
    existingUsers.forEach(u => {
      if (u.sys_id) userMap.set(u.sys_id, u);
      if (u.username) userMap.set(u.username, u);
    });

    let successCount = 0;
    let newCount = 0;
    let updateCount = 0;

    // Concurrency-limited parallel hashing
    const BATCH_SIZE = 10;
    for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
      const chunk = validEntries.slice(i, i + BATCH_SIZE);
      
      await Promise.all(chunk.map(async (entry) => {
        try {
          const hashedPassword = await bcrypt.hash(entry.password, 10);
          const normalizedSysId = entry.sys_id;
          
          const existing = userMap.get(normalizedSysId) || userMap.get(entry.username);

          if (existing) {
            await this.prisma.user.update({
              where: { id: existing.id },
              data: { 
                sys_id: normalizedSysId,
                fullName: entry.fullName, 
                username: entry.username, 
                password: hashedPassword,
                company_label: label,
              }
            });
            updateCount++;
          } else {
            await this.prisma.user.create({
              data: {
                sys_id: normalizedSysId,
                fullName: entry.fullName,
                username: entry.username,
                password: hashedPassword,
                role: 'EMPLOYEE',
                company_label: label,
              }
            });
            newCount++;
          }
          successCount++;
        } catch (err) {
          this.logger.error(`Failed to sync user ${entry.sys_id}: ${err.message}`);
        }
      }));
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
          const match = item.text.match(/CSC-?[\d-]+/i);
          if (match) {
            ids.push(this.normalizeSysId(match[0]));
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

  async createPayrollRequest(userId: string, data: any) {
    if (!userId) {
      throw new HttpException('User ID is required for payroll requests', HttpStatus.BAD_REQUEST);
    }
    return this.prisma.payrollRequest.create({
      data: {
        userId,
        type: data.type,
        status: 'PENDING',
        clientName: data.clientName,
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
        remark: data.remark,
        batchId: data.batchId,
      }
    });
  }

  async getPendingRequests() {
    return this.prisma.payrollRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getStaffRequests(userId: string) {
    return this.prisma.payrollRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async respondToRequest(requestId: string, status: 'APPROVED' | 'REJECTED') {
    const request = await this.prisma.payrollRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) throw new HttpException('Request not found', HttpStatus.NOT_FOUND);

    // If it's a REVOKE request and it's being approved, perform the deletion
    if (request.type === 'REVOKE' && status === 'APPROVED' && request.batchId) {
      await this.deleteBatch(request.batchId);
    }

    return this.prisma.payrollRequest.update({
      where: { id: requestId },
      data: { status }
    });
  }
}
