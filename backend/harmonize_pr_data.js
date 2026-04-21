const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log('--- PR DATA HARMONIZATION STARTED ---');

    // 1. Delete empty placeholder PRs that have the "PR NO." prefix but 0 items
    const deleted = await prisma.purchaseRequest.deleteMany({
        where: {
            prNo: { startsWith: 'PR NO.' },
            items: { equals: [] }
        }
    });
    console.log(`Deleted ${deleted.count} empty PR placeholders.`);

    // 2. Standardize PR numbers for those that are missing the "PR NO." prefix
    const allPrs = await prisma.purchaseRequest.findMany();
    let updatedCount = 0;

    for (const pr of allPrs) {
        // If it's just a number (6 digits) or doesn't have the "PR NO." prefix
        if (!pr.prNo.startsWith('PR NO.')) {
            const cleanNo = pr.prNo.replace('PR-', '').padStart(6, '0');
            const newPrNo = `PR NO. ${cleanNo}`;
            
            await prisma.purchaseRequest.update({
                where: { id: pr.id },
                data: { prNo: newPrNo }
            });
            updatedCount++;
        }
    }

    console.log(`Standardized ${updatedCount} PR numbers to 'PR NO.' format.`);
    console.log('--- PR DATA HARMONIZATION COMPLETED ---');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
