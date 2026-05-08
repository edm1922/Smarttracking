
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding performance test log entries for deletion (NO STOCK REVERSION)...');
  
  const result = await prisma.productTransaction.deleteMany({
    where: {
      remarks: {
        contains: 'Performance test log entry',
        mode: 'insensitive'
      }
    }
  });

  console.log(`Successfully deleted ${result.count} log entries. Current stock levels were NOT affected.`);
  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
