const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function migrate() {
  const filePath = path.resolve(__dirname, '../supply_system_export.xlsx');
  const workbook = XLSX.readFile(filePath);

  console.log('--- MIGRATION STARTED ---');

  // 1. LOCATIONS
  const locationSheet = XLSX.utils.sheet_to_json(workbook.Sheets['locations']);
  const locationMap = new Map(); // oldId -> newId

  console.log(`Migrating ${locationSheet.length} locations...`);
  for (const loc of locationSheet) {
    const existing = await prisma.location.findUnique({ where: { name: loc.name } });
    if (existing) {
      locationMap.set(loc.id, existing.id);
    } else {
      const created = await prisma.location.create({
        data: {
          name: loc.name,
          description: loc.description || ''
        }
      });
      locationMap.set(loc.id, created.id);
    }
  }

  // 2. ITEMS -> PRODUCTS
  const itemSheet = XLSX.utils.sheet_to_json(workbook.Sheets['items']);
  const productMap = new Map(); // oldId -> newId

  console.log(`Migrating items to products...`);
  for (const item of itemSheet) {
    // FILTER: Inventory System Category only (Exclude items that look like QR forms)
    // Assuming QR form items have specific keywords or patterns. 
    // Based on user request "leave out the QR FORM SYSTEM for now"
    const lowerName = (item.name || '').toLowerCase();
    if (lowerName.includes('qr form') || lowerName.includes('qr-form')) {
      console.log(`Skipping QR FORM item: ${item.name}`);
      continue;
    }

    const sku = item.sku || `OLD-P${item.id}`;
    const existing = await prisma.product.findUnique({ where: { sku } });

    if (existing) {
      productMap.set(item.id, existing.id);
    } else {
      const created = await prisma.product.create({
        data: {
          sku,
          name: item.name,
          description: item.description || '',
          unit: item.unit || 'PCS',
          price: parseFloat(item.price) || 0,
          threshold: parseFloat(item.standard_stock) || 0,
        }
      });
      productMap.set(item.id, created.id);
    }
  }

  // 3. PRODUCT STOCKS
  const stockSheet = XLSX.utils.sheet_to_json(workbook.Sheets['product_stock']);
  console.log(`Migrating ${stockSheet.length} stock records...`);
  for (const stock of stockSheet) {
    const productId = productMap.get(stock.product_id);
    const locationId = locationMap.get(stock.location_id);

    if (productId && locationId) {
      await prisma.productStock.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: {
          productId,
          locationId,
          quantity: parseInt(stock.quantity) || 0
        },
        update: {
          quantity: parseInt(stock.quantity) || 0
        }
      });
    }
  }

  // 4. PURCHASE REQUESTS
  const prSheet = XLSX.utils.sheet_to_json(workbook.Sheets['purchase_requests']);
  console.log(`Migrating ${prSheet.length} purchase requests...`);
  for (const pr of prSheet) {
    const prNo = `PR NO. ${pr.pr_no.toString().padStart(6, '0')}`;
    const existing = await prisma.purchaseRequest.findUnique({ where: { prNo } });

    if (!existing) {
      await prisma.purchaseRequest.create({
        data: {
          prNo,
          date: new Date(pr.request_date),
          department: pr.department || 'N/A',
          endUser: pr.end_user || 'N/A',
          position: pr.position || '',
          sourceSupplier: pr.supplier || '',
          preparedBy: pr.prepared_by || '',
          approvedBy: pr.approved_by || '',
          status: pr.status || 'PENDING',
          items: [] // No items found in this specific export sheet
        }
      });
    }
  }

  console.log('--- MIGRATION COMPLETED ---');
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
