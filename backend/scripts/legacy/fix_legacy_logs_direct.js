const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

// Using direct connection to bypass pooler limits if possible
// Original: postgresql://postgres.dtpjhomraxyezpvwfymv:[PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
const directUrl = "postgresql://postgres.dtpjhomraxyezpvwfymv:Tripz0219!!!@db.dtpjhomraxyezpvwfymv.supabase.co:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function run() {
    console.log('Connecting to database direct...');
    const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
    const workbook = XLSX.readFile(filePath);
    const excelLogs = XLSX.utils.sheet_to_json(workbook.Sheets['quick_pull_logs']);

    const dbLogs = await prisma.productTransaction.findMany({
        where: {
            remarks: { contains: 'Legacy Quick Pull' }
        }
    });

    console.log(`Found ${dbLogs.length} legacy logs in DB.`);
    let updatedCount = 0;

    for (const log of dbLogs) {
        const match = log.remarks.match(/Legacy Quick Pull:\s*(.*?)\s*\(Dest:\s*(.*?)\)/);
        if (match) {
            const purpose = match[1].trim();
            const destination = match[2].trim();

            const excelRow = excelLogs.find(r => 
                (r.purpose || '').toString().trim() === purpose && 
                (r.destination || '').toString().trim() === destination
            );

            if (excelRow && excelRow.requested_by) {
                const newRemarks = `Legacy Quick Pull: ${purpose} | Dest: ${destination} | Req by: ${excelRow.requested_by}`;
                await prisma.productTransaction.update({
                    where: { id: log.id },
                    data: { remarks: newRemarks }
                });
                updatedCount++;
            }
        }
    }

    console.log(`Successfully updated ${updatedCount} legacy logs.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
