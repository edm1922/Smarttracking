// v2.1: Final PDF reader fix
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

// Import pdfreader (Pure JS)
const { PdfReader } = require("pdfreader");

/**
 * Extracts text from a single-page PDF buffer
 */
async function getPageText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = '';
    new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
      if (err) reject(err);
      else if (!item) resolve(text);
      else if (item.text) text += item.text + ' ';
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clientLabel = (formData.get('label') || formData.get('client_name')) as string;
    const periodStart = (formData.get('periodStart') || formData.get('period_start')) as string;
    const periodEnd = (formData.get('periodEnd') || formData.get('period_end')) as string;
    const files = formData.getAll('files') as File[];

    if (!clientLabel || !files.length) {
      return NextResponse.json({ error: 'Missing client label or files' }, { status: 400 });
    }

    // 1. Create the Storage Batch
    const batch = await prisma.storageBatch.create({
      data: {
        client_name: clientLabel,
        period_start: periodStart ? new Date(periodStart) : null,
        period_end: periodEnd ? new Date(periodEnd) : null,
        label: `${clientLabel} - ${periodStart || 'No Date'}`
      }
    });

    // 2. Prepare upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents', batch.id);
    await mkdir(uploadDir, { recursive: true });

    let successCount = 0;
    const errors = [];

    // 3. Process each uploaded file
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        
        // Use pdf-lib for splitting
        const mainPdfDoc = await PDFDocument.load(bytes);
        const pageCount = mainPdfDoc.getPageCount();

        // Map to hold [sys_id] -> [array of page indices]
        const employeePages: Record<string, number[]> = {};

        // SCAN PAGES TO IDENTIFY EMPLOYEES
        for (let i = 0; i < pageCount; i++) {
          // Create a single-page PDF to extract text from
          const subDoc = await PDFDocument.create();
          const [page] = await subDoc.copyPages(mainPdfDoc, [i]);
          subDoc.addPage(page);
          const subBytes = await subDoc.save();
          
          // Get text using pdfreader (Pure JS)
          const text = await getPageText(Buffer.from(subBytes));

          // Find CSC- ID
          const idMatch = text.match(/CSC-[\d-]+/i);
          const sys_id = idMatch ? idMatch[0].toUpperCase() : 'UNKNOWN';

          if (!employeePages[sys_id]) employeePages[sys_id] = [];
          employeePages[sys_id].push(i);
        }

        // GENERATE PDFs FOR EACH EMPLOYEE
        for (const [sys_id, pageIndices] of Object.entries(employeePages)) {
          const newPdf = await PDFDocument.create();
          const copiedPages = await newPdf.copyPages(mainPdfDoc, pageIndices);
          copiedPages.forEach(p => newPdf.addPage(p));
          
          const newBytes = await newPdf.save();
          const fileName = `${sys_id}_${batch.id}_${Math.random().toString(36).substring(7)}.pdf`;
          const filePath = join(uploadDir, fileName);
          const relativePath = `/uploads/documents/${batch.id}/${fileName}`;

          await writeFile(filePath, Buffer.from(newBytes));

          // Find corresponding User
          let userId = null;
          if (sys_id !== 'UNKNOWN') {
            const user = await prisma.user.findUnique({ where: { sys_id } });
            if (user) userId = user.id;
          }

          await prisma.document.create({
            data: {
              batch_id: batch.id,
              sys_id: sys_id,
              user_id: userId,
              file_name: fileName,
              storage_path: relativePath,
              file_type: 'PDF'
            }
          });

          successCount++;
        }

      } catch (fileErr: any) {
        console.error(`Error processing file ${file.name}:`, fileErr);
        errors.push({ file: file.name, error: fileErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      count: successCount,
      message: `Successfully processed ${successCount} payslips.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
