const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function parseExcelDate(excelDate) {
  if (!excelDate) return new Date();
  if (typeof excelDate === 'number') {
    // Excel serial date to JS date
    return new Date((excelDate - 25569) * 86400 * 1000);
  }
  const parsed = new Date(excelDate);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

// Clean and normalize fabric names to match database names
function normalizeFabricName(name) {
  if (!name) return '';
  let n = name.trim().toUpperCase();
  n = n.replace('APHAGINA', 'ALPHAGINA');
  n = n.replace('ALPAGINA', 'ALPHAGINA');
  n = n.replace('LAVANDER', 'LAVENDER');
  n = n.replace('SKYBLUE', 'SKY BLUE');
  return n;
}

async function main() {
  console.log("=== STARTING HIGH-FIDELITY RSQ DATA IMPORT ===");

  const filePath = path.resolve(__dirname, '2026_Fabric & Tailor Request Records (1).xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Transaction'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Get or create UNASSIGNED tailor
  let tailor = await prisma.tailor.findFirst({
    where: { name: 'UNASSIGNED' }
  });
  if (!tailor) {
    tailor = await prisma.tailor.create({
      data: { name: 'UNASSIGNED' }
    });
  }

  // Fetch all fabrics for matching
  const allFabrics = await prisma.fabric.findMany();
  console.log(`Loaded ${allFabrics.length} fabrics from DB.`);

  // Clean existing transactions first to prevent key violations
  console.log("Clearing existing FabricTransactions...");
  const deleteCount = await prisma.fabricTransaction.deleteMany({});
  console.log(`Deleted ${deleteCount.count} legacy transactions.`);

  // Process rows
  let importedCount = 0;
  let skippedCount = 0;

  for (let i = 3; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0]) {
      continue;
    }

    const rawTransactionNo = row[0];
    const rawSeriesNo = row[1];
    const rsqNo = row[2] ? row[2].trim() : '';
    const apparel = row[3] ? row[3].trim() : '';
    const type = row[5] ? row[5].trim() : '';
    const month = row[6] ? row[6].trim() : '';
    const date = parseExcelDate(row[7]);
    const qty = parseFloat(row[8]) || 0;
    const unit = row[9] ? row[9].trim() : 'Roll';
    const remarks = row[21] ? row[21].trim() : '';

    // Normalize fabric name and find it in DB
    const normFabricName = normalizeFabricName(apparel);
    let fabric = allFabrics.find(f => normalizeFabricName(f.name) === normFabricName);

    if (!fabric) {
      // If fabric not found, create a new fabric record to make the import bulletproof
      console.log(`Fabric not found for: "${apparel}" (Normalized: "${normFabricName}"). Creating...`);
      fabric = await prisma.fabric.create({
        data: {
          name: normFabricName,
          type: row[4] ? row[4].trim() : 'OTHER',
          unit: unit,
          unitPrice: parseFloat(row[10]) || 0
        }
      });
      allFabrics.push(fabric);
    }

    // Combine transactionNo and seriesNo for uniqueness
    const dbTransactionNo = `${rawTransactionNo}_${rawSeriesNo}`;

    // Map Transaction Type
    let dbType = 'STOCK_IN';
    if (type === 'BEGINNING') dbType = 'INITIAL_BALANCE';
    else if (type === 'WITHDRAWAL') dbType = 'WITHDRAWAL';
    else if (type === 'RETURN') dbType = 'RETURN';
    else if (type === 'STOCK IN') dbType = 'STOCK_IN';

    // Encode variables into remarks string
    // Structure: RSQ: RSQ-XXXXX | Month: MONTH YEAR | Remarks: custom remarks
    let dbRemarks = `RSQ: ${rsqNo || '—'} | Month: ${month || '—'} | Remarks: ${remarks || ''}`;

    try {
      // 1. Create FabricTransaction
      await prisma.fabricTransaction.create({
        data: {
          transactionNo: dbTransactionNo,
          fabricId: fabric.id,
          type: dbType,
          quantity: qty,
          unit: unit,
          remarks: dbRemarks,
          date: date
        }
      });

      // 2. Handle Tailoring Request record association for withdrawal/return items
      if (rsqNo && rsqNo !== '—' && (dbType === 'WITHDRAWAL' || dbType === 'RETURN')) {
        const existingRequest = await prisma.tailoringRequest.findFirst({
          where: { rsqNo }
        });

        if (existingRequest) {
          // Update existing request with correct fabric and order quantity
          await prisma.tailoringRequest.update({
            where: { id: existingRequest.id },
            data: {
              fabricId: fabric.id,
              quantityOrdered: qty,
              remarks: `Imported Product: ${normFabricName}`
            }
          });
        } else {
          // Create a new tailoring request if it is missing
          await prisma.tailoringRequest.create({
            data: {
              rsqNo: rsqNo,
              fabricId: fabric.id,
              tailorId: tailor.id,
              quantityOrdered: qty,
              quantityReceived: dbType === 'RETURN' ? qty : 0,
              status: dbType === 'RETURN' ? 'COMPLETED' : 'PENDING',
              remarks: `Imported Product: ${normFabricName}`
            }
          });
        }
      }

      importedCount++;
    } catch (err) {
      console.error(`Failed to import row ${i+1} (${dbTransactionNo}):`, err.message);
      skippedCount++;
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Successfully imported: ${importedCount} transactions.`);
  console.log(`Failed / Skipped: ${skippedCount} rows.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
