import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clientLabel = formData.get('label') as string;
    const periodStart = formData.get('periodStart') as string;
    const periodEnd = formData.get('periodEnd') as string;
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

    // 3. Process each file
    for (const file of files) {
      try {
        const fileName = file.name;
        // Extract ID from filename (e.g. CSC-1001.pdf -> CSC-1001)
        const idMatch = fileName.match(/^(CSC-\d+)/i);
        const sys_id = idMatch ? idMatch[1].toUpperCase() : null;

        let userId = null;
        if (sys_id) {
          const user = await prisma.user.findUnique({ where: { sys_id } });
          if (user) userId = user.id;
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = join(uploadDir, fileName);
        const relativePath = `/uploads/documents/${batch.id}/${fileName}`;

        await writeFile(filePath, buffer);

        await prisma.document.create({
          data: {
            batch_id: batch.id,
            sys_id: sys_id || 'UNKNOWN',
            user_id: userId,
            file_name: fileName,
            storage_path: relativePath,
            file_type: 'PDF'
          }
        });

        successCount++;
      } catch (fileErr: any) {
        console.error(`Error processing file ${file.name}:`, fileErr);
        errors.push({ file: file.name, error: fileErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
