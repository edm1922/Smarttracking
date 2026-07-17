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
  // Vercel Hobby allows up to 60s per serverless function. We use a shorter
  // budget (30s) to leave headroom for the PDF download at start, the final
  // status-token write, response serialization, and — critically — to keep
  // each chain call short enough that concurrent /processing-status polls
  // don't pile up behind a long-running lambda and trigger browser/Vercel
  // network resets ("Failed to fetch").
  // Locally there's no lambda timeout, so treat it as unlimited (10 min).
  // This avoids all resume-chain overhead — the PDF gets downloaded from
  // Supabase once, processed in one pass, and done — matching the pre-
  // chunking performance from May 13.
  private readonly TIME_BUDGET_MS = process.env.VERCEL ? 30000 : 600000;
  // Process this many pages in parallel inside the loop. Each page does a
  // Supabase upload + 1-2 Prisma queries, all I/O bound, so concurrency helps.
  private readonly PAGE_CONCURRENCY = 1;
  // Update the [PROGRESS:N] token in the batch remark every N pages instead of
  // on every page (saves ~270 DB writes per 278-page batch).
  private readonly PROGRESS_UPDATE_EVERY = 10;
  private readonly MAX_ERROR_RETRIES = 3;
  private supabaseAdmin;

  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase configuration missing (URL or Key)');
    }

    this.supabaseAdmin = createClient(supabaseUrl || '', supabaseKey || '');
  }

  private activeBatches = new Set<string>();
  private cancelledBatches = new Set<string>();

  private async updateBatchStatusToken(
    batchId: string,
    statusToken:
      | '[BATCH_STATUS:PROCESSING]'
      | '[BATCH_STATUS:COMPLETED]'
      | '[BATCH_STATUS:FAILED]',
  ) {
    try {
      const batch = await this.prisma.storageBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) return;
      let cleanRemark = batch.remark || '';
      // Strip any existing token to prevent duplicates
      cleanRemark = cleanRemark.replace(/\[BATCH_STATUS:[A-Z]+\]\s*/g, '');
      const newRemark = `${statusToken} ${cleanRemark}`.trim();
      await this.prisma.storageBatch.update({
        where: { id: batchId },
        data: { remark: newRemark },
      });
    } catch (err) {
      this.logger.error(
        `Failed to update status token for batch ${batchId}: ${err.message}`,
      );
    }
  }

  private normalizeSysId(id: string): string {
    if (!id) return '';
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = id.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (clean.startsWith('CSC')) {
      const numbers = clean.substring(3);
      if (numbers.length > 4) {
        return `CSC-${numbers.substring(0, 4)}-${numbers.substring(4)}`;
      } else if (numbers.length > 0) {
        return `CSC-${numbers}`;
      }
      return 'CSC';
    }
    if (clean.startsWith('TEMP')) {
      const numbers = clean.substring(4);
      if (numbers.length > 0) {
        return `TEMP-${numbers}`;
      }
      return 'TEMP';
    }
    return clean;
  }

  async processMasterPdf(pdfBuffer: Buffer, batchData: any) {
    const {
      clientName,
      periodStart,
      periodEnd,
      label,
      remark,
      releaseDate,
      resumeBatchId,
      sourcePath,
    } = batchData;
    this.logger.log(
      `Starting precision 1-page splitting for ${clientName}${resumeBatchId ? ` (RESUMING batch: ${resumeBatchId})` : ''}`,
    );

    let batch;

    const sourcePdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = sourcePdfDoc.getPageCount();

    if (resumeBatchId) {
      if (!batchData.alreadyLocked) {
        if (this.activeBatches.has(resumeBatchId)) {
          // Another in-flight call on this lambda instance is already processing
          // this batch. Don't 409 — just return a benign "keep polling" response so
          // the client chain doesn't break, and the existing call finishes its work.
          this.logger.warn(
            `Resume requested for batch ${resumeBatchId} while another call is in flight on this instance. Returning early.`,
          );
          // Return timedOut:false so the client chain exits cleanly. The polling
          // safety net will re-attach a chain after 30s if the batch is still
          // marked PROCESSING. This avoids spinning at 4 calls/sec.
          return {
            batchId: resumeBatchId,
            totalPages: 0,
            processed: 0,
            added: 0,
            skipped: 0,
            errors: 0,
            timedOut: false,
            alreadyRunning: true,
            details: [],
          };
        }
        this.activeBatches.add(resumeBatchId);
      }
      batch = await this.prisma.storageBatch.findUnique({
        where: { id: resumeBatchId },
      });
      if (!batch) {
        throw new HttpException(
          'Batch to resume not found',
          HttpStatus.NOT_FOUND,
        );
      }
      // Don't resume FAILED or COMPLETED batches — the safety-net may
      // rediscover them from a stale processing-ids cache.
      if (batch.remark?.includes('[BATCH_STATUS:FAILED]') || batch.remark?.includes('[BATCH_STATUS:COMPLETED]')) {
        this.logger.warn(
          `Batch ${batch.id} is already ${batch.remark.match(/\[BATCH_STATUS:[A-Z]+\]/)?.[0] || 'TERMINAL'}. Skipping resume.`,
        );
        return {
          batchId: resumeBatchId,
          totalPages: 0,
          processed: 0,
          added: 0,
          skipped: 0,
          errors: 0,
          timedOut: false,
          alreadyRunning: false,
          cannotResume: true,
          details: [],
        };
      }
      this.logger.log(
        `Resuming batch ${batch.id}. Will skip already processed documents.`,
      );
      await this.updateBatchStatusToken(batch.id, '[BATCH_STATUS:PROCESSING]');
    } else {
      // Create the batch record with FILEPATH embedded from the start
      const filepathToken = sourcePath ? ` [FILEPATH:${sourcePath}]` : '';
      batch = await this.prisma.storageBatch.create({
        data: {
          client_name: clientName,
          period_start: periodStart ? new Date(periodStart) : null,
          period_end: periodEnd ? new Date(periodEnd) : null,
          release_date: releaseDate ? new Date(releaseDate) : null,
          label: label,
          remark: `[BATCH_STATUS:PROCESSING] [TOTAL_PAGES:${totalPages}]${filepathToken} ${remark || ''}`.trim(),
        },
      });
      this.activeBatches.add(batch.id);
    }
    const results: Array<{
      page: number;
      id?: string;
      status: 'success' | 'skipped' | 'error';
      reason?: string;
      error?: string;
    }> = [];
    let finalStatus: '[BATCH_STATUS:COMPLETED]' | '[BATCH_STATUS:FAILED]' =
      '[BATCH_STATUS:COMPLETED]';
    let timedOut = false;

    try {
      // Pre-fetch existing documents in this batch if resuming
      const processedPages = new Map<string, Set<number>>();
      // Set of page numbers already processed (any employee). Used to skip the
      // expensive PDF extract/scan on resume — critical for large batches because
      // otherwise every chain step burns its budget re-scanning done pages.
      const processedPageNumbers = new Set<number>();
      if (resumeBatchId) {
        const existingDocs = await this.prisma.document.findMany({
          where: { batch_id: batch.id },
          select: { sys_id: true, file_name: true },
        });

        existingDocs.forEach((d) => {
          const id = this.normalizeSysId(d.sys_id);
          // Extract page number from filename: employeeId_pX_timestamp.pdf
          const pageMatch = d.file_name.match(/_p(\d+)_/);
          const page = pageMatch ? parseInt(pageMatch[1], 10) : 1;

          if (!processedPages.has(id)) {
            processedPages.set(id, new Set());
          }
          processedPages.get(id)?.add(page);
          processedPageNumbers.add(page);
        });

        this.logger.log(
          `Pre-fetched ${existingDocs.length} existing documents (${processedPageNumbers.size} unique pages) for batch ${batch.id}.`,
        );

        // Skip errored pages only if they exceeded MAX_ERROR_RETRIES
        // Format: [ERRORED_PAGES:35@2,82@1] — page@retryCount
        const erroredMatch = batch.remark?.match(/\[ERRORED_PAGES:([^\]]+)\]/);
        if (erroredMatch) {
          const pagesToRetry: string[] = [];
          erroredMatch[1].split(',').forEach((entry) => {
            const parts = entry.trim().split('@');
            const page = parseInt(parts[0], 10);
            const retries = parts[1] ? parseInt(parts[1], 10) : 0;
            if (!isNaN(page)) {
              if (retries >= this.MAX_ERROR_RETRIES) {
                processedPageNumbers.add(page);
                pagesToRetry.push(entry.trim());
              }
            }
          });
          const skipped = erroredMatch[1].split(',').length - pagesToRetry.length;
          if (skipped > 0) {
            this.logger.log(
              `Skipping ${skipped} permanently failed pages (exceeded ${this.MAX_ERROR_RETRIES} retries) for batch ${batch.id}. Will retry the rest.`,
            );
          }
        }
      }

      // Cache for user lookups to avoid redundant DB calls
      const userCache = new Map<string, any>();
      const loopStartTime = Date.now();
      let lastProgressWritten = 0;

      const writeProgressToken = async (currentPage: number) => {
        try {
          const currentRemark =
            (
              await this.prisma.storageBatch.findUnique({
                where: { id: batch.id },
                select: { remark: true },
              })
            )?.remark || '';
          const filepathToken =
            currentRemark.match(/\[FILEPATH:[^\]]+\]/)?.[0] ||
            batch.remark?.match(/\[FILEPATH:[^\]]+\]/)?.[0] ||
            '';
          const existingErrorMatch = currentRemark.match(/\[ERRORED_PAGES:([^\]]+)\]/);
          const existingErrorMap = new Map<number, number>();
          if (existingErrorMatch) {
            existingErrorMatch[1].split(',').forEach((entry) => {
              const parts = entry.trim().split('@');
              const page = parseInt(parts[0], 10);
              const retries = parts[1] ? parseInt(parts[1], 10) : 0;
              if (!isNaN(page)) existingErrorMap.set(page, retries);
            });
          }
          const currentErrorPages = results
            .filter((r) => r.status === 'error')
            .map((r) => r.page);
          currentErrorPages.forEach((p) => {
            existingErrorMap.set(p, (existingErrorMap.get(p) || 0) + 1);
          });
          const mergedErrors = Array.from(existingErrorMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([page, retries]) => `${page}@${retries}`);
          const errorToken = mergedErrors.length > 0 ? ` [ERRORED_PAGES:${mergedErrors.join(',')}]` : '';
          const baseRemark = currentRemark
            .replace(/\[BATCH_STATUS:[A-Z]+\]\s*/g, '')
            .replace(/\[TOTAL_PAGES:\d+\]\s*/g, '')
            .replace(/\[PROGRESS:\d+\]\s*/g, '')
            .replace(/\[FILEPATH:[^\]]+\]\s*/g, '')
            .replace(/\[ERRORED_PAGES:[^\]]+\]\s*/g, '')
            .trim();
          const newRemark =
            `[BATCH_STATUS:PROCESSING] [TOTAL_PAGES:${totalPages}] [PROGRESS:${currentPage}]${errorToken} ${filepathToken} ${baseRemark}`
              .replace(/\s+/g, ' ')
              .trim();
          await this.prisma.storageBatch.update({
            where: { id: batch.id },
            data: { remark: newRemark },
          });
        } catch (updateErr) {
          this.logger.error(
            `Failed to update progress at page ${currentPage}: ${updateErr.message}`,
          );
        }
      };

      // Process a single page (extract → scan → upload → persist).
      // Throws on fatal errors (e.g., batch deleted); other errors are recorded.
      let fatalAbort = false;
      const processOnePage = async (i: number) => {
        const pageNumber = i + 1;

        // Fast skip on resume: if this page is already done, don't re-extract or
        // re-parse it. This is what makes resuming a large batch actually progress.
        if (resumeBatchId && processedPageNumbers.has(pageNumber)) {
          results.push({
            page: pageNumber,
            status: 'skipped',
            reason: 'Already processed',
          });
          return;
        }

        try {
          const singlePagePdf = await PDFDocument.create();
          const [copiedPage] = await singlePagePdf.copyPages(sourcePdfDoc, [i]);
          singlePagePdf.addPage(copiedPage);
          const pageBytes = await singlePagePdf.save();

          const idsOnPage = await this.scanSinglePageForIds(
            Buffer.from(pageBytes),
          );

          if (idsOnPage.length === 0) {
            this.logger.warn(`No ID found on page ${pageNumber}, skipping.`);
            // Mark as "tried" so a future resume of this same batch doesn't
            // re-extract and re-scan this page (e.g. cover/summary pages).
            processedPageNumbers.add(pageNumber);
            results.push({
              page: pageNumber,
              status: 'skipped',
              reason: 'No ID found',
            });
            return;
          }

          for (let employeeId of idsOnPage) {
            employeeId = this.normalizeSysId(employeeId);

            if (
              resumeBatchId &&
              processedPages.get(employeeId)?.has(pageNumber)
            ) {
              results.push({
                page: pageNumber,
                id: employeeId,
                status: 'skipped',
                reason: 'Duplicate',
              });
              continue;
            }

            const fileName = `${employeeId}_p${pageNumber}_${Date.now()}.pdf`;
            const filePath = `documents/${batch.id}/${fileName}`;

            const { error: uploadError } = await this.supabaseAdmin.storage
              .from('payroll-documents')
              .upload(filePath, pageBytes, {
                contentType: 'application/pdf',
                upsert: true,
              });
            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = this.supabaseAdmin.storage
              .from('payroll-documents')
              .getPublicUrl(filePath);

            const cacheKey = `${employeeId}_${label || ''}`;
            let employee = userCache.get(cacheKey);
            if (!employee && !userCache.has(cacheKey)) {
              employee = await this.prisma.user.findFirst({
                where: {
                  sys_id: employeeId,
                  ...(label ? { company_label: label } : {}),
                },
              });
              userCache.set(cacheKey, employee || null);
            }

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

            if (!processedPages.has(employeeId)) {
              processedPages.set(employeeId, new Set());
            }
            processedPages.get(employeeId)?.add(pageNumber);
            processedPageNumbers.add(pageNumber);

            results.push({
              page: pageNumber,
              id: employeeId,
              status: 'success',
            });
          }
        } catch (err: any) {
          this.logger.error(
            `Error processing page ${pageNumber}: ${err.message}`,
          );
          results.push({
            page: pageNumber,
            status: 'error',
            error: err.message,
          });
          processedPageNumbers.add(pageNumber);
          if (
            err.message &&
            err.message.includes('Foreign key constraint') &&
            err.message.includes('batch_id')
          ) {
            this.logger.warn(
              `Batch ${batch?.id || 'unknown'} was deleted mid-processing. Aborting remaining pages.`,
            );
            fatalAbort = true;
          }
          if (
            err.message &&
            (err.message.includes('connection pool') ||
              err.message.includes('connection_limit') ||
              err.code === 'P2024')
          ) {
            this.logger.error(
              `Database connection pool exhausted at page ${pageNumber}. Aborting remaining pages so client can resume cleanly later.`,
            );
            fatalAbort = true;
          }
        }
      };

      // Process pages in parallel chunks of PAGE_CONCURRENCY.
      // After each chunk: check cancellation, throttle progress writes, check time budget.
      let i = 0;
      while (i < totalPages) {
        if (this.cancelledBatches.has(batch.id)) {
          this.logger.warn(
            `Batch ${batch.id} was cancelled by user. Stopping processing.`,
          );
          this.cancelledBatches.delete(batch.id);
          break;
        }
        if (fatalAbort) break;

        const chunkEnd = Math.min(i + this.PAGE_CONCURRENCY, totalPages);
        const chunkPromises: Promise<void>[] = [];
        for (let j = i; j < chunkEnd; j++) {
          chunkPromises.push(processOnePage(j));
        }
        await Promise.all(chunkPromises);
        i = chunkEnd;

        // Throttled progress write
        if (
          i - lastProgressWritten >= this.PROGRESS_UPDATE_EVERY ||
          i >= totalPages
        ) {
          await writeProgressToken(i);
          lastProgressWritten = i;
        }

        // Time budget check — stop and let the client resume
        if (Date.now() - loopStartTime > this.TIME_BUDGET_MS) {
          this.logger.log(
            `Time budget exceeded at page ${i}/${totalPages}. Will resume later.`,
          );
          timedOut = true;
          // Final progress write before returning
          if (i !== lastProgressWritten) {
            await writeProgressToken(i);
            lastProgressWritten = i;
          }
          break;
        }
      }

      const added = results.filter((r) => r.status === 'success').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      const errors = results.filter((r) => r.status === 'error').length;

      if (errors > 0 || this.cancelledBatches.has(batch.id)) {
        finalStatus = '[BATCH_STATUS:FAILED]';
      }

      return {
        batchId: batch.id,
        totalPages,
        processed: results.length,
        added,
        skipped,
        errors,
        timedOut,
        details: results,
      };
    } catch (outerError) {
      finalStatus = '[BATCH_STATUS:FAILED]';
      throw outerError;
    } finally {
      const bId = batch?.id || resumeBatchId;
      if (bId) {
        this.activeBatches.delete(bId);
      }
      if (batch) {
        if (timedOut) {
          this.logger.log(`Batch ${batch.id} partially processed (${results.length}/${totalPages}). Keeping PROCESSING status for resume.`);
        } else {
          this.logger.log(`Finished processing batch ${batch.id}. Lock released.`);
          await this.updateBatchStatusToken(batch.id, finalStatus);
        }
      }
    }
  }

  async getProcessingStatus() {
    const dbBatches = await this.prisma.storageBatch.findMany({
      where: {
        remark: { contains: '[BATCH_STATUS:PROCESSING]' },
      },
      select: { id: true },
    });

    const dbIds = dbBatches.map((b) => b.id);
    const inMemoryIds = Array.from(this.activeBatches);

    return Array.from(new Set([...inMemoryIds, ...dbIds]));
  }

  async cancelBatchProcessing(batchId: string) {
    // Signal any in-flight lambda to stop
    if (this.activeBatches.has(batchId)) {
      this.cancelledBatches.add(batchId);
    }
    // Always update the DB so the batch stops appearing in /processing-status
    // even if no lambda is currently processing it (serverless-safe).
    try {
      const existing = await this.prisma.storageBatch.findUnique({
        where: { id: batchId },
        select: { remark: true },
      });
      if (existing) {
        const cleanRemark = (existing.remark || '')
          .replace(/\[BATCH_STATUS:[A-Z]+\]\s*/g, '')
          .replace(/\[PROGRESS:\d+\]\s*/g, '')
          .trim();
        await this.prisma.storageBatch.update({
          where: { id: batchId },
          data: {
            remark: `[BATCH_STATUS:FAILED] ${cleanRemark}`,
          },
        });
        this.logger.log(`Batch ${batchId} marked as FAILED in database.`);
      }
    } catch (dbErr) {
      this.logger.error(`Failed to mark batch ${batchId} as FAILED: ${dbErr.message}`);
    }
    return { status: 'Cancelled', message: 'Processing halted and batch marked as FAILED.' };
  }

  async reviseDocuments(
    batchId: string,
    selectedSysIds: string[],
    remark: string,
    fileBuffer: Buffer,
  ) {
    const batch = await this.prisma.storageBatch.findUnique({
      where: { id: batchId },
    });
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

        const ids = (
          await this.scanSinglePageForIds(Buffer.from(singlePageBytes))
        ).map((id) => this.normalizeSysId(id));
        const targetSysId = ids.find((id) =>
          selectedSysIds.map((s) => this.normalizeSysId(s)).includes(id),
        );

        if (targetSysId) {
          const fileName = `${targetSysId}_revised_${Date.now()}.pdf`;
          const storagePath = `documents/${batchId}/${fileName}`;

          const { error } = await this.supabaseAdmin.storage
            .from('payroll-documents')
            .upload(storagePath, singlePageBytes, {
              contentType: 'application/pdf',
              upsert: true,
            });

          if (error)
            throw new Error(`Supabase upload failed: ${error.message}`);

          const publicUrl = this.supabaseAdmin.storage
            .from('payroll-documents')
            .getPublicUrl(storagePath).data.publicUrl;

          const existingDocs = await this.prisma.document.findMany({
            where: { batch_id: batchId, sys_id: targetSysId },
          });

          if (existingDocs.length > 0) {
            await this.prisma.document.updateMany({
              where: { batch_id: batchId, sys_id: targetSysId },
              data: {
                storage_path: publicUrl,
                file_name: fileName,
                remark: remark || 'Revised Document',
                created_at: new Date(),
              },
            });
          } else {
            const employee = await this.prisma.user.findUnique({
              where: { sys_id: targetSysId },
            });
            await this.prisma.document.create({
              data: {
                batch_id: batchId,
                user_id: employee?.id || null,
                sys_id: targetSysId,
                storage_path: publicUrl,
                file_name: fileName,
                file_type: 'PAYSLIP_PAGE',
                remark: remark || 'Revised Document',
              },
            });
          }
          revisedCount++;
        }
      } catch (err) {
        this.logger.error(
          `Error processing revision page ${i}: ${err.message}`,
        );
      }
    }

    return { success: true, count: revisedCount };
  }

  async getEmployees() {
    const users = await this.prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      include: {
        documents: {
          select: { batch_id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      sys_id: user.sys_id,
      password: user.password,
      role: user.role,
      run_ids: user.documents.map((d) => d.batch_id),
      createdAt: user.createdAt,
      company_label: user.company_label,
    }));
  }

  async portalLogin(username: string, pass: string) {
    const cleanUsername = (username || '').toLowerCase().trim();
    const cleanPass = (pass || '').trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: 'insensitive' } },
          { sys_id: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new HttpException(
        'Invalid username or password.',
        HttpStatus.UNAUTHORIZED,
      );
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
      throw new HttpException(
        'Invalid username or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.logsService.create({
      userId: user.id,
      action: 'LOGIN',
      changes: { username: user.username },
    });

    return {
      id: user.id,
      sys_id: user.sys_id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const dbPass = (user.password || '').trim();
    let isMatch = false;

    if (dbPass.startsWith('$2a$') || dbPass.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(currentPassword, dbPass);
    } else {
      isMatch = dbPass.toLowerCase() === currentPassword.toLowerCase();
    }

    if (!isMatch) {
      throw new HttpException('Current password is incorrect', HttpStatus.UNAUTHORIZED);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.logsService.create({
      userId,
      action: 'PASSWORD_CHANGE',
      changes: { username: user.username },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  async deleteBatch(batchId: string) {
    const batch = await this.prisma.storageBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new HttpException('Batch not found', HttpStatus.NOT_FOUND);
    }

    const folderPath = `documents/${batchId}`;
    let hasMore = true;
    const limit = 500;

    while (hasMore) {
      const { data: filesList, error: listError } =
        await this.supabaseAdmin.storage
          .from('payroll-documents')
          .list(folderPath, { limit, offset: 0 });

      if (listError || !filesList || filesList.length === 0) {
        hasMore = false;
        break;
      }

      const validFiles = filesList.filter(
        (f) => f.name !== '.emptyFolderPlaceholder',
      );
      if (validFiles.length > 0) {
        const filePaths = validFiles.map((f) => `${folderPath}/${f.name}`);
        const chunkSize = 100;
        for (let i = 0; i < filePaths.length; i += chunkSize) {
          const chunk = filePaths.slice(i, i + chunkSize);
          const { error } = await this.supabaseAdmin.storage
            .from('payroll-documents')
            .remove(chunk);

          if (error) {
            this.logger.error(
              `Error deleting chunk from storage: ${error.message}`,
            );
          }
        }
      }

      // If we only got empty placeholders or nothing valid left, we break
      if (validFiles.length === 0) {
        hasMore = false;
      }
    }

    await this.prisma.document.deleteMany({
      where: { batch_id: batchId },
    });

    await this.prisma.storageBatch.delete({
      where: { id: batchId },
    });

    // Clean up active and cancelled tracking sets to prevent UI ghost state
    this.activeBatches.delete(batchId);
    this.cancelledBatches.delete(batchId);

    return { success: true, message: `Batch ${batchId} deleted successfully.` };
  }

  async getBatches() {
    return this.prisma.storageBatch.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });
  }

  async getLatestBatch() {
    const batch = await this.prisma.storageBatch.findFirst({
      orderBy: { created_at: 'desc' },
    });
    return batch || null;
  }

  async deleteEmployee(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async bulkDeleteEmployees(ids: string[]) {
    return this.prisma.user.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  async syncBulkEmployees(text: string, label?: string) {
    if (!text)
      throw new HttpException('No text provided', HttpStatus.BAD_REQUEST);

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const validEntries = [];

    for (const line of lines) {
      const match = line.match(/^(CSC-?[\d-]+)\s+(.+)$/i);
      if (match) {
        const sys_id = this.normalizeSysId(match[1]);
        const fullName = match[2].trim();

        const nameParts = fullName.split(',').map((p) => p.trim());
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFirstTwo = firstName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 2);

        const idSuffix = sys_id.split('-').pop() || '';
        const username = `${cleanLast}${cleanFirstTwo}${idSuffix}`;

        validEntries.push({
          sys_id,
          fullName,
          username,
          password: sys_id.replace(/-/g, ''),
        });
      }
    }

    if (validEntries.length === 0) {
      return {
        success: true,
        count: 0,
        newCount: 0,
        message: 'No valid entries found.',
      };
    }

    // Optimization: Batch lookup existing users
    const allSysIds = validEntries.map((e) => e.sys_id);
    const allUsernames = validEntries.map((e) => e.username);

    const existingUsers = await this.prisma.user.findMany({
      where: {
        OR: [{ sys_id: { in: allSysIds } }, { username: { in: allUsernames } }],
      },
    });

    const userMap = new Map<string, any>();
    existingUsers.forEach((u) => {
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

      await Promise.all(
        chunk.map(async (entry) => {
          try {
            const hashedPassword = await bcrypt.hash(entry.password, 10);
            const normalizedSysId = entry.sys_id;

            const existing =
              userMap.get(normalizedSysId) || userMap.get(entry.username);

            if (existing) {
              await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                  sys_id: normalizedSysId,
                  fullName: entry.fullName,
                  username: entry.username,
                  password: hashedPassword,
                  company_label: label,
                },
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
                },
              });
              newCount++;
            }
            successCount++;
          } catch (err) {
            this.logger.error(
              `Failed to sync user ${entry.sys_id}: ${err.message}`,
            );
          }
        }),
      );
    }

    return {
      success: true,
      count: successCount,
      newCount,
      message: `Successfully provisioned ${successCount} accounts. ${newCount > 0 ? `New: ${newCount}.` : ''}`,
    };
  }

  async getEmployeePayslips(sysId: string) {
    return this.prisma.document.findMany({
      where: { sys_id: sysId },
      include: {
        batch: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAllPayslips() {
    return this.prisma.document.findMany({
      include: {
        batch: true,
        user: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSignedUploadUrl(fileName: string) {
    const filePath = `temp-uploads/${Date.now()}-${fileName}`;
    const { data, error } = await this.supabaseAdmin.storage
      .from('payroll-documents')
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      filePath: filePath,
    };
  }

  async processRemoteMasterPdf(remotePath: string | undefined, batchData: any) {
    const resumeBatchId = batchData.resumeBatchId;
    this.logger.log(`processRemoteMasterPdf called: remotePath=${remotePath}, resumeBatchId=${resumeBatchId}, sourcePath=${batchData.sourcePath}`);
    if (resumeBatchId) {
      if (this.activeBatches.has(resumeBatchId)) {
        this.logger.warn(
          `Resume requested for batch ${resumeBatchId} while another call is in flight. Returning early.`,
        );
        return {
          batchId: resumeBatchId,
          totalPages: 0,
          processed: 0,
          added: 0,
          skipped: 0,
          errors: 0,
          timedOut: false,
          alreadyRunning: true,
          details: [],
        };
      }
      this.activeBatches.add(resumeBatchId);
      batchData.alreadyLocked = true;
    }

    // If no remotePath but resuming, extract filepath from batch remark
    if (!remotePath && batchData.resumeBatchId) {
      try {
        const existing = await this.prisma.storageBatch.findUnique({
          where: { id: batchData.resumeBatchId },
          select: { remark: true },
        });
        const remark = existing?.remark || '';
        const fp = remark.match(/\[FILEPATH:([^\]]+)\]/)?.[1];
        if (fp) {
          remotePath = fp;
          this.logger.log(
            `Resolved remote file path from remark for batch ${batchData.resumeBatchId}: ${remotePath}`,
          );
        } else {
          this.logger.error(
            `Resume failed for batch ${batchData.resumeBatchId}: remark="${remark.substring(0, 500)}"`,
          );
          if (resumeBatchId) {
            this.activeBatches.delete(resumeBatchId);
          }
          // Return a benign "already done" response so the frontend chain stops
          // trying, instead of retrying forever with a 400. The batch will remain
          // in PROCESSING status in the DB but the safety-net will give up after
          // 10 consecutive failures and mark it FAILED.
          return {
            batchId: batchData.resumeBatchId,
            totalPages: 0,
            processed: 0,
            added: 0,
            skipped: 0,
            errors: 0,
            timedOut: false,
            alreadyRunning: false,
            cannotResume: true,
            details: [],
          };
        }
      } catch (dbErr) {
        if (resumeBatchId) {
          this.activeBatches.delete(resumeBatchId);
        }
        throw dbErr;
      }
    }

    if (!remotePath) {
      if (resumeBatchId) {
        this.activeBatches.delete(resumeBatchId);
      }
      this.logger.error(
        `No file path for processing (resumeBatchId=${resumeBatchId || 'none'}, sourcePath=${batchData.sourcePath || 'none'}). ` +
        `If this is a resume call, the batch remark may be missing [FILEPATH:...].`
      );
      throw new HttpException(
        'No file path provided for processing',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Downloading remote PDF from Supabase: ${remotePath}`);
    const { data, error: downloadError } = await this.supabaseAdmin.storage
      .from('payroll-documents')
      .download(remotePath);

    if (downloadError) {
      this.logger.error(
        `Failed to download remote PDF: ${downloadError.message}`,
      );
      if (resumeBatchId) {
        this.activeBatches.delete(resumeBatchId);
      }
      // Source file is gone — mark the batch as FAILED so the frontend stops
      // retrying, and return a benign response.
      if (batchData.resumeBatchId) {
        await this.cancelBatchProcessing(batchData.resumeBatchId);
      }
      return {
        batchId: batchData.resumeBatchId || 'unknown',
        totalPages: 0,
        processed: 0,
        added: 0,
        skipped: 0,
        errors: 0,
        timedOut: false,
        alreadyRunning: false,
        cannotResume: true,
        details: [],
      };
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    try {
      // sourcePath is passed via batchData so processMasterPdf can embed
      // [FILEPATH:...] in the batch remark at creation time — no post-hoc
      // write needed.
      batchData.sourcePath = remotePath;
      const result = await this.processMasterPdf(buffer, batchData);

      const fullyProcessed =
        typeof result.processed === 'number' &&
        typeof result.totalPages === 'number' &&
        result.totalPages > 0 &&
        result.processed >= result.totalPages;

      if (result.alreadyRunning || result.cannotResume) {
        this.logger.log(
          `Batch ${result.batchId} early exit (alreadyRunning/cannotResume). Keeping source file.`,
        );
      } else if (result.timedOut || !fullyProcessed) {
        this.logger.log(
          `Batch ${result.batchId} partially processed (${result.processed}/${result.totalPages}). Keeping source file for resume.`,
        );
      } else {
        // Clean up temp file only when processing is actually complete
        this.logger.log(`Cleaning up remote PDF: ${remotePath}`);
        await this.supabaseAdmin.storage
          .from('payroll-documents')
          .remove([remotePath]);
      }

      return result;
    } catch (err) {
      if (resumeBatchId) {
        this.activeBatches.delete(resumeBatchId);
      }
      this.logger.error(`Error processing remote PDF: ${err.message}`);
      throw err;
    }
  }

  private async scanSinglePageForIds(buffer: Buffer): Promise<string[]> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const ids: string[] = [];

      try {
        new pdfReader.PdfReader().parseBuffer(buffer, (err, item) => {
          if (resolved) return;

          if (err) {
            resolved = true;
            return reject(err);
          }
          if (!item) {
            resolved = true;
            return resolve([...new Set(ids)]);
          }

          if (item.text) {
            const match = item.text.match(/(?:CSC|TEMP)-?[\d-]+/i);
            if (match) {
              ids.push(this.normalizeSysId(match[0]));
            }
          }
        });
      } catch (syncErr) {
        if (!resolved) {
          resolved = true;
          reject(syncErr);
        }
      }
    });
  }

  async saveCompany(name: string) {
    if (!name)
      throw new HttpException(
        'Company name is required',
        HttpStatus.BAD_REQUEST,
      );
    const cleanName = name.trim().toUpperCase();

    return this.prisma.company.upsert({
      where: { name: cleanName },
      update: {},
      create: { name: cleanName },
    });
  }

  async getCompanies() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async deleteCompany(id: string) {
    return this.prisma.company.delete({
      where: { id },
    });
  }

  async createPayrollRequest(userId: string, data: any) {
    if (!userId) {
      throw new HttpException(
        'User ID is required for payroll requests',
        HttpStatus.BAD_REQUEST,
      );
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
      },
    });
  }

  async getPendingRequests() {
    return this.prisma.payrollRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStaffRequests(userId: string) {
    return this.prisma.payrollRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async respondToRequest(requestId: string, status: 'APPROVED' | 'REJECTED') {
    const request = await this.prisma.payrollRequest.findUnique({
      where: { id: requestId },
    });

    if (!request)
      throw new HttpException('Request not found', HttpStatus.NOT_FOUND);

    // If it's a REVOKE request and it's being approved, perform the deletion
    if (request.type === 'REVOKE' && status === 'APPROVED' && request.batchId) {
      await this.deleteBatch(request.batchId);
    }

    return this.prisma.payrollRequest.update({
      where: { id: requestId },
      data: { status },
    });
  }
}
