const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

async function migrate() {
    const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
    const workbook = XLSX.readFile(filePath);

    console.log('--- PR MIGRATION STARTED ---');

    // 1. Load Items
    const itemsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['purchase_items']);
    const itemsMap = new Map(); // pr_id -> [items]
    itemsSheet.forEach(item => {
        if (!itemsMap.has(item.pr_id)) itemsMap.set(item.pr_id, []);
        itemsMap.get(item.pr_id).push({
            description: item.description || '',
            unit: item.unit || 'PCS',
            quantity: parseFloat(item.qty) || 0,
            estimatedCost: parseFloat(item.price) || 0
        });
    });

    // 2. Load Requests
    const prSheet = XLSX.utils.sheet_to_json(workbook.Sheets['purchase_requests']);
    console.log(`Found ${prSheet.length} PR headers in Excel.`);

    let migratedCount = 0;
    for (const pr of prSheet) {
        // Format PR number like the old system if it's just a number
        const prNo = pr.pr_no.toString().padStart(6, '0');
        const prItems = itemsMap.get(pr.id) || [];

        // Check if this PR (by No and Date) already exists to avoid duplicates if re-run
        // Using a combined check for robustness
        const existing = await prisma.purchaseRequest.findFirst({
            where: {
                prNo: prNo,
                date: new Date(pr.request_date),
                endUser: pr.end_user || 'N/A'
            }
        });

        if (!existing) {
            await prisma.purchaseRequest.create({
                data: {
                    prNo: prNo,
                    date: new Date(pr.request_date),
                    department: pr.department || 'N/A',
                    endUser: pr.end_user || 'N/A',
                    position: pr.position || '',
                    sourceSupplier: pr.supplier || '',
                    preparedBy: pr.prepared_by || '',
                    approvedBy: pr.approved_by || '',
                    status: pr.status || 'PENDING',
                    items: prItems
                }
            });
            migratedCount++;
            // Add delay to avoid connection spikes
            await new Promise(r => setTimeout(r, 100));
        } else if (Array.isArray(existing.items) && existing.items.length === 0 && prItems.length > 0) {
            // Update items if they were missing
            await prisma.purchaseRequest.update({
                where: { id: existing.id },
                data: { items: prItems }
            });
            console.log(`Updated items for existing PR: ${prNo}`);
            migratedCount++;
        }
    }

    console.log(`Successfully migrated ${migratedCount} Purchase Requests with items.`);
    console.log('--- PR MIGRATION COMPLETED ---');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
