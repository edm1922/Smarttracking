const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function parseExcelDate(excelDate) {
  if (!excelDate) return new Date();
  if (typeof excelDate === 'number') {
    return new Date((excelDate - 25569) * 86400 * 1000);
  }
  const parsed = new Date(excelDate);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

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
  console.log("=== STARTING SUPER-FAST HIGH-FIDELITY RSQ DATA IMPORT ===");

  const filePath = path.resolve(__dirname, '2026_Fabric & Tailor Request Records (1).xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Transaction'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Get or create UNASSIGNED tailor
  let tailor = await prisma.tailor.findFirst({ where: { name: 'UNASSIGNED' } });
  if (!tailor) {
    tailor = await prisma.tailor.create({ data: { name: 'UNASSIGNED' } });
  }

  // Pre-fetch everything from DB in single queries
  console.log("Caching Fabrics and TailoringRequests from database...");
  const allFabrics = await prisma.fabric.findMany();
  const allRequests = await prisma.tailoringRequest.findMany();
  console.log(`Cached ${allFabrics.length} fabrics and ${allRequests.length} tailoring requests.`);

  // Clean existing transactions first to prevent key violations
  console.log("Clearing existing TailoringRequests...");
  const deleteRequestsCount = await prisma.tailoringRequest.deleteMany({});
  console.log(`Deleted ${deleteRequestsCount.count} legacy tailoring requests.`);

  console.log("Clearing existing FabricTransactions...");
  const deleteCount = await prisma.fabricTransaction.deleteMany({});
  console.log(`Deleted ${deleteCount.count} legacy transactions.`);

  // We will build a list of tasks to execute
  const tasks = [];
  const activeRequestsMap = new Map(); // We wiped them, so map is empty starting fresh!
  const activeFabricsMap = new Map(allFabrics.map(f => [normalizeFabricName(f.name), f]));

  for (let i = 3; i < rawData.length; i++) {
    const row = rawData[i];
    // Skip empty rows or placeholder rows that lack apparel/fabric name or transaction type
    if (!row || !row[0] || !row[3] || !row[5]) continue;

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
    const actualApparel = row[15] ? row[15].trim() : '';

    // Lookup fabric in-memory
    const normFabricName = normalizeFabricName(apparel);
    let fabric = activeFabricsMap.get(normFabricName);

    tasks.push({
      index: i + 1,
      rawTransactionNo,
      rawSeriesNo,
      rsqNo,
      apparel,
      normFabricName,
      type,
      month,
      date,
      qty,
      unit,
      remarks,
      actualApparel,
      price: parseFloat(row[10]) || 0,
      group: row[4] ? row[4].trim() : 'OTHER'
    });
  }

  console.log(`Prepared ${tasks.length} transaction records to process.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    let fabric = activeFabricsMap.get(task.normFabricName);
    
    if (!fabric) {
      // Create fabric dynamically if missing
      try {
        fabric = await prisma.fabric.create({
          data: {
            name: task.normFabricName,
            type: task.group,
            unit: task.unit,
            unitPrice: task.price
          }
        });
        activeFabricsMap.set(task.normFabricName, fabric);
      } catch (err) {
        fabric = await prisma.fabric.findFirst({ where: { name: task.normFabricName } });
        if (fabric) activeFabricsMap.set(task.normFabricName, fabric);
      }
    }

    if (!fabric) {
      console.error(`Row ${task.index}: Fabric not available, skipping.`);
      failCount++;
      continue;
    }

    const dbTransactionNo = `${task.rawTransactionNo}_${task.rawSeriesNo}_${task.index}`;

    // Map Transaction Type
    let dbType = 'STOCK_IN';
    if (task.type === 'BEGINNING') dbType = 'INITIAL_BALANCE';
    else if (task.type === 'WITHDRAWAL') dbType = 'WITHDRAWAL';
    else if (task.type === 'RETURN') dbType = 'RETURN';
    else if (task.type === 'STOCK IN') dbType = 'STOCK_IN';

    // Encode remarks
    const dbRemarks = `RSQ: ${task.rsqNo || '—'} | Month: ${task.month || '—'} | Remarks: ${task.remarks || ''}`;

    try {
      // 1. Create FabricTransaction
      await prisma.fabricTransaction.create({
        data: {
          transactionNo: dbTransactionNo,
          fabricId: fabric.id,
          type: dbType,
          quantity: task.qty,
          unit: task.unit,
          remarks: dbRemarks,
          date: task.date
        }
      });

      // 2. Handle Tailoring Request
      if (task.rsqNo && task.rsqNo !== '—' && (dbType === 'WITHDRAWAL' || dbType === 'RETURN')) {
        const existingRequest = activeRequestsMap.get(task.rsqNo);

        if (existingRequest) {
          await prisma.tailoringRequest.update({
            where: { id: existingRequest.id },
            data: {
              fabricId: fabric.id,
              quantityOrdered: task.qty,
              remarks: task.actualApparel || existingRequest.remarks || `Imported Product: ${task.normFabricName}`
            }
          });
        } else {
          const newRequest = await prisma.tailoringRequest.create({
            data: {
              rsqNo: task.rsqNo,
              fabricId: fabric.id,
              tailorId: tailor.id,
              quantityOrdered: task.qty,
              quantityReceived: dbType === 'RETURN' ? task.qty : 0,
              status: dbType === 'RETURN' ? 'COMPLETED' : 'PENDING',
              remarks: task.actualApparel || `Imported Product: ${task.normFabricName}`
            }
          });
          activeRequestsMap.set(task.rsqNo, newRequest);
        }
      }

      successCount++;
    } catch (err) {
      console.error(`Row ${task.index} failed (${dbTransactionNo}):`, err.message);
      failCount++;
    }

    if ((i + 1) % 20 === 0 || i === tasks.length - 1) {
      console.log(`Processed ${i + 1} / ${tasks.length} records (${successCount} successful, ${failCount} failed)`);
    }
  }

  console.log(`\n=== IMPORT COMPLETED SUCCESSFULLY ===`);
  console.log(`Total Success: ${successCount}`);
  console.log(`Total Failed: ${failCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
