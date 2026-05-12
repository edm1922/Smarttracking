const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

async function migrate() {
    console.log('--- ISSUANCE REQUEST MIGRATION STARTED (OPTIMIZED) ---');
    const filePath = '../ALL_REQUESTS_EXPORT.xlsx';
    const workbook = XLSX.readFile(filePath);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    console.log(`Found ${data.length} requests in Excel.`);

    // 1. Cache Products for speed
    const allProducts = await prisma.product.findMany();
    const productCache = new Map();
    allProducts.forEach(p => {
        productCache.set(`${p.name}|${p.description || ''}`, p.id);
        if (!productCache.has(p.name)) productCache.set(p.name, p.id); // Fallback
    });

    // 2. Get default location
    const defaultLoc = await prisma.location.findFirst({
        where: { name: { contains: 'MAIN' } }
    }) || await prisma.location.findFirst();

    if (!defaultLoc) {
        console.error('No locations found in DB.');
        return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Find product in cache
        let productId = productCache.get(`${row['Item Name']}|${row['Description'] || ''}`) || productCache.get(row['Item Name']);

        if (!productId) {
            skippedCount++;
            continue;
        }

        // Convert Excel date
        const date = new Date((row.Date - 25569) * 86400 * 1000);

        // Check for duplicate
        const existing = await prisma.internalRequest.findFirst({
            where: {
                employeeName: row.Employee || 'Unknown',
                date: date,
                productId: productId,
                quantity: parseInt(row.Qty) || 1
            }
        });

        if (existing) {
            duplicateCount++;
            continue;
        }

        const reqNo = `REQ-${i.toString().padStart(5, '0')}-${Date.now().toString().slice(-4)}`;

        try {
            await prisma.internalRequest.create({
                data: {
                    requestNo: reqNo,
                    date: date,
                    employeeName: row.Employee || 'Unknown',
                    employeeRole: 'Personnel',
                    departmentArea: row.Area || 'N/A',
                    shift: 'DAY',
                    supervisor: 'System',
                    locationId: defaultLoc.id,
                    productId: productId,
                    quantity: parseInt(row.Qty) || 1,
                    status: row.Status || 'PENDING',
                    remarks: `Migrated from ALL_REQUESTS_EXPORT. Original: ${row['Item Name']}`
                }
            });
            migratedCount++;
            if (migratedCount % 50 === 0) console.log(`Progress: ${migratedCount} migrated...`);
        } catch (err) {
            console.error(`Error on row ${i}: ${err.message}`);
        }
    }

    console.log(`Summary:`);
    console.log(`- Successfully Migrated: ${migratedCount}`);
    console.log(`- Skipped (Duplicates): ${duplicateCount}`);
    console.log(`- Skipped (Product Not Found): ${skippedCount}`);
    console.log('--- MIGRATION COMPLETED ---');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
