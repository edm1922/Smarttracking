const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function migrate() {
  const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
  const workbook = XLSX.readFile(filePath);

  console.log('--- MIGRATION STARTED (WITH STOCK RECONSTRUCTION) ---');

  // 0. RECONSTRUCT STOCK FROM LOGS
  const logSheet = workbook.Sheets['inventory_action_logs'];
  const logData = XLSX.utils.sheet_to_json(logSheet);
  const reconstructedStock = new Map();

  console.log(`Analyzing ${logData.length} logs for stock reconstruction...`);
  logData.forEach(log => {
    const details = log.details || '';
    const match = details.match(/Remaining Stock:\s*([\d.]+)/);
    if (match) {
        const stock = Math.floor(parseFloat(match[1])); // Use floor for integer stock
        reconstructedStock.set(log.item_name, stock);
    }
  });
  console.log(`Reconstructed stock for ${reconstructedStock.size} items.`);

  // 1. LOCATIONS
  const locationSheet = XLSX.utils.sheet_to_json(workbook.Sheets['locations']);
  const locationMap = new Map(); // oldId -> newId

  console.log(`Migrating ${locationSheet.length} locations...`);
  let primaryLocationId = null;
  for (const loc of locationSheet) {
    const existing = await prisma.location.findUnique({ where: { name: loc.name } });
    if (existing) {
      locationMap.set(loc.id, existing.id);
      if (!primaryLocationId) primaryLocationId = existing.id;
    } else {
      const created = await prisma.location.create({
        data: {
          name: loc.name,
          description: loc.description || ''
        }
      });
      locationMap.set(loc.id, created.id);
      if (!primaryLocationId) primaryLocationId = created.id;
    }
  }

  // 2. ITEMS -> PRODUCTS
  const itemSheet = XLSX.utils.sheet_to_json(workbook.Sheets['items']);
  const productMap = new Map(); // oldId -> newId

  console.log(`Migrating items to products...`);
  for (const item of itemSheet) {
    const lowerName = (item.name || '').toLowerCase();
    if (lowerName.includes('qr form') || lowerName.includes('qr-form')) continue;

    const sku = item.sku || `OLD-P${item.id}`;
    
    // Get stock from reconstruction or column (fallback)
    const stockFromLogs = reconstructedStock.get(item.name) || 0;
    const stockFromCol = parseInt(item.actual_stock) || 0;
    const finalStock = Math.max(stockFromLogs, stockFromCol);

    const existing = await prisma.product.findUnique({ where: { sku } });
    let productId;

    if (existing) {
      productId = existing.id;
      // Update price/threshold if needed
      await prisma.product.update({
        where: { id: productId },
        data: {
            price: parseFloat(item.price) || existing.price,
            threshold: parseFloat(item.standard_stock) || existing.threshold,
        }
      });
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
      productId = created.id;
    }
    productMap.set(item.id, productId);

    // Assign Stock to primary location
    if (finalStock > 0 && primaryLocationId) {
        await prisma.productStock.upsert({
            where: { productId_locationId: { productId, locationId: primaryLocationId } },
            create: { productId, locationId: primaryLocationId, quantity: finalStock },
            update: { quantity: finalStock }
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
