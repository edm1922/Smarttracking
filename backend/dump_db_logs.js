const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const logs = await prisma.productTransaction.findMany({
        where: {
            remarks: { contains: 'Legacy Quick Pull' }
        },
        take: 5
    });
    console.log('Sample Legacy Logs:', logs);
}

run().catch(console.error).finally(() => prisma.$disconnect());
