const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const prisma = new PrismaClient();

const shiftMap = {
  'PRODUCTION': '307',
  'PRODUCTION 307': '307',
  'PRODUCTION 603': '603',
  'SANITATION TUNE 3': '603',
  'SANITATION MP': '603',
  'SANITATION': '603',
  'TB-LOINING': '603',
  'LOINING LOCAL': '603',
  'CAN LABELLING WAREHOUSE': '307',
  'CAN LABELLING T3': '603',
  'MAKAR VAAS': '307',
  'TUNA 3 PACKING LOCAL': '603',
  'PACKING LOCAL': '603',
  'PACKING LOCAL L-G': '603',
  'PACKING LOCAL L': '603',
  'PACKING LOCAL/PHILVEST': '603',
  'PACKING LOCAL LINE-C': 'MK-DS',
  'PACKING LINE 1 TUNA 3': 'FO-NS',
  'PACKING LOCAL T-3': 'FO-NS',
  'PACKING LOCAL TUNE 3 L6': '603',
  'PK LOCAL TUNE 3 L6': '603',
  'PK L3 TUNA 3': '603',
  'TUNA 3': '603',
  'LINE 6 ALPHA PACKING': '603',
  '603 PACKING COM': '603',
  'BIGDOME MACKEREL PACKING': '603',
  'BIGDOME MACKEREL RECEIVING/CUTTING SECTION': '603',
  'BIGDOME PETFOOD': '603',
  'BIGDOME': '603',
  'MP': '603',
  'VEGIE PREP': '603',
  'TUNA 3 VEG PREP': '603',
  'AWI WHSE': '603',
  'RECEIVING': '603',
  'FINANCE': '307',
  'DEFECTIVES': '603',
  'EXPORT SKINNING / LOINING': '603',
  'PROJECT TELESCOPE': '603',
};

function getShiftFromArea(area) {
  if (!area) return '603';
  const upperArea = area.toUpperCase();
  
  if (shiftMap[upperArea]) return shiftMap[upperArea];
  
  const match = upperArea.match(/\b(\d{3})\b/);
  if (match) return match[1];
  
  return '603';
}

async function main() {
  const filePath = path.join(__dirname, '../../ISSUANCE_LOG_EXPORT.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Starting import of ${data.length} records...`);

  const MAIN_OFFICE_ID = '8b5aa3c2-bb57-4cfa-936d-ddd1435d159a';

  const productMap = {};

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      const itemName = row['Item Name'] || 'Unknown Item';
      const sku = itemName.toUpperCase().replace(/\s+/g, '-').substring(0, 20) + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();

      let productId = productMap[itemName];
      if (!productId) {
        let product = await prisma.product.findFirst({
          where: { name: { equals: itemName, mode: 'insensitive' } }
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: itemName,
              sku: sku,
              description: row['Description'] || '',
              unit: 'PCS'
            }
          });
        }
        productId = product.id;
        productMap[itemName] = productId;
      }

      let date = new Date();
      if (row['Date'] && typeof row['Date'] === 'number') {
        date = new Date((row['Date'] - 25569) * 86400 * 1000);
      }

      const area = row['Area'] || 'General';
      const shift = getShiftFromArea(area);

      await prisma.internalRequest.create({
        data: {
          requestNo: `HIST-${i + 1}-${Date.now().toString().slice(-4)}`,
          date: date,
          employeeName: row['Employee'] || 'Unknown',
          employeeRole: 'Staff',
          departmentArea: area,
          shift: shift,
          supervisor: 'LEGACY IMPORT',
          locationId: MAIN_OFFICE_ID,
          productId: productId,
          quantity: parseInt(row['Qty']) || 1,
          status: row['Status'] || 'FULFILLED',
          remarks: row['Description'] || '',
          createdAt: date
        }
      });

      successCount++;
      if (successCount % 50 === 0) console.log(`Imported ${successCount} records...`);
    } catch (err) {
      console.error(`Error importing row ${i + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log(`Import complete! Success: ${successCount}, Errors: ${errorCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });