const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function migrate() {
  const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
  const workbook = XLSX.readFile(filePath);

  console.log('--- MIGRATION STARTED (FINAL STOCK RECOVERY) ---');

  // 1. RECONSTRUCT STOCK FROM LOGS (as backup)
  const logSheet = workbook.Sheets['inventory_action_logs'];
  const logData = XLSX.utils.sheet_to_json(logSheet);
  const logStock = new Map();
  logData.forEach(log => {
    const details = log.details || '';
    const match = details.match(/Remaining Stock:\s*([\d.]+)/);
    if (match) {
        logStock.set(log.item_name, Math.floor(parseFloat(match[1])));
    }
  });

  // 2. LOCATIONS
  const locationSheet = XLSX.utils.sheet_to_json(workbook.Sheets['locations']);
  const locationMap = new Map(); // oldId -> newId
  for (const loc of locationSheet) {
    const existing = await prisma.location.findUnique({ where: { name: loc.name } });
    const id = existing ? existing.id : (await prisma.location.create({ data: { name: loc.name, description: loc.description || '' } })).id;
    locationMap.set(loc.id, id);
  }

  // 3. ITEMS -> PRODUCTS
  const itemSheet = XLSX.utils.sheet_to_json(workbook.Sheets['items']);
  const productMap = new Map(); // oldId -> newId
  const productNameMap = new Map(); // oldId -> name

  for (const item of itemSheet) {
    const lowerName = (item.name || '').toLowerCase();
    if (lowerName.includes('qr form') || lowerName.includes('qr-form')) continue;

    const sku = item.sku || `OLD-P${item.id}`;
    const existing = await prisma.product.findUnique({ where: { sku } });
    
    let productId;
    if (existing) {
      productId = existing.id;
      await prisma.product.update({
        where: { id: productId },
        data: { threshold: parseFloat(item.standard_stock) || existing.threshold }
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
    productNameMap.set(item.id, item.name);
  }

  // 4. STOCKS SHEET (The real deal)
  const stockSheet = XLSX.utils.sheet_to_json(workbook.Sheets['stocks']);
  console.log(`Migrating ${stockSheet.length} explicit stock records...`);
  const itemsWithExplicitStock = new Set();

  for (const s of stockSheet) {
    const productId = productMap.get(s.item_id);
    const locationId = locationMap.get(s.location_id);
    if (productId && locationId) {
      await prisma.productStock.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, quantity: parseInt(s.quantity) || 0 },
        update: { quantity: parseInt(s.quantity) || 0 }
      });
      itemsWithExplicitStock.add(s.item_id);
    }
  }

  // 5. BACKUP STOCK FROM LOGS (For items NOT in stocks sheet)
  console.log('Checking for items with log-only stock...');
  const firstLocId = Array.from(locationMap.values())[0];
  for (const [oldId, productId] of productMap.entries()) {
    if (!itemsWithExplicitStock.has(oldId)) {
        const name = productNameMap.get(oldId);
        const lStock = logStock.get(name);
        if (lStock > 0 && firstLocId) {
            console.log(`Using log stock for ${name}: ${lStock}`);
            await prisma.productStock.upsert({
                where: { productId_locationId: { productId, locationId: firstLocId } },
                create: { productId, locationId: firstLocId, quantity: lStock },
                update: { quantity: lStock }
            });
        }
    }
  }

  console.log('--- MIGRATION COMPLETED ---');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
