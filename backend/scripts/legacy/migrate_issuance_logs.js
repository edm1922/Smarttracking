const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

async function migrate() {
    console.log('--- ISSUANCE LOG MIGRATION STARTED ---');
    const filePath = '../ISSUANCE_LOG_EXPORT.xlsx';
    const workbook = XLSX.readFile(filePath);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    console.log(`Found ${data.length} logs in Excel.`);

    // 1. Get default admin user
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    }) || await prisma.user.findFirst();

    if (!admin) {
        console.error('No users found in DB.');
        return;
    }

    // 2. Cache Products
    const allProducts = await prisma.product.findMany();
    const productCache = new Map();
    allProducts.forEach(p => {
        productCache.set(`${p.name}|${p.description || ''}`, p.id);
        if (!productCache.has(p.name)) productCache.set(p.name, p.id);
    });

    // 3. Get default location
    const defaultLoc = await prisma.location.findFirst({
        where: { name: { contains: 'MAIN' } }
    }) || await prisma.location.findFirst();

    let migratedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        let productId = productCache.get(`${row['Item Name']}|${row['Description'] || ''}`) || productCache.get(row['Item Name']);

        if (!productId) {
            skippedCount++;
            continue;
        }

        const date = new Date((row.Date - 25569) * 86400 * 1000);

        try {
            await prisma.productTransaction.create({
                data: {
                    productId: productId,
                    locationId: defaultLoc.id,
                    userId: admin.id,
                    type: 'OUT',
                    quantity: parseInt(row.Qty) || 1,
                    remarks: `Repaired Log: ${row.Area || 'N/A'} | ${row.Employee || 'Unknown'} | Migrated from ISSUANCE_LOG_EXPORT`,
                    createdAt: date
                }
            });
            migratedCount++;
            if (migratedCount % 50 === 0) console.log(`Progress: ${migratedCount} logs migrated...`);
        } catch (err) {
            console.error(`Error on row ${i}: ${err.message}`);
        }
    }

    console.log(`Summary:`);
    console.log(`- Successfully Migrated Logs: ${migratedCount}`);
    console.log(`- Skipped (Product Not Found): ${skippedCount}`);
    console.log('--- MIGRATION COMPLETED ---');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
