const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../../ISSUANCE_LOG_EXPORT.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Starting import of ${data.length} records...`);

  const MAIN_OFFICE_ID = '8b5aa3c2-bb57-4cfa-936d-ddd1435d159a';

  // Map to store product names to IDs to avoid multiple lookups
  const productMap = {};

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      const itemName = row['Item Name'] || 'Unknown Item';
      const sku = itemName.toUpperCase().replace(/\s+/g, '-').substring(0, 20) + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();

      // Get or create product
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

      // Convert Excel Date
      let date = new Date();
      if (row['Date'] && typeof row['Date'] === 'number') {
        date = new Date((row['Date'] - 25569) * 86400 * 1000);
      }

      // Create Request
      await prisma.internalRequest.create({
        data: {
          requestNo: `HIST-${i + 1}-${Date.now().toString().slice(-4)}`,
          date: date,
          employeeName: row['Employee'] || 'Unknown',
          employeeRole: 'Staff',
          departmentArea: row['Area'] || 'General',
          shift: 'SHIFT 1',
          supervisor: 'LEGACY IMPORT',
          locationId: MAIN_OFFICE_ID,
          productId: productId,
          quantity: parseInt(row['Qty']) || 1,
          status: row['Status'] || 'FULFILLED',
          remarks: row['Description'] || '',
          createdAt: date // Set createdAt to match historical date
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
