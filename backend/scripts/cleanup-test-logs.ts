
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding performance test log entries...');
  
  const logs = await prisma.productTransaction.findMany({
    where: {
      remarks: {
        contains: 'Performance test log entry',
        mode: 'insensitive'
      }
    }
  });

  console.log(`Found ${logs.length} log entries to delete.`);

  for (const log of logs) {
    process.stdout.write(`Deleting log ${log.id} (${log.remarks})... `);
    try {
      await prisma.$transaction(async (tx) => {
        // Revert stock
        const stock = await tx.productStock.findUnique({
          where: {
            productId_locationId: {
              productId: log.productId,
              locationId: log.locationId,
            },
          },
        });

        if (stock) {
          const adjustment = log.type === 'IN' ? -log.quantity : log.quantity;
          const newQty = stock.quantity + adjustment;
          
          // If newQty < 0, we'll log it and skip or force to 0? 
          // Usually test data might be messy. Let's just allow it or log a warning.
          if (newQty < 0) {
            console.log(`\nWarning: Reverting log ${log.id} would result in negative stock (${newQty}). Setting to 0 instead.`);
            await tx.productStock.update({
              where: { id: stock.id },
              data: { quantity: 0 },
            });
          } else {
            await tx.productStock.update({
              where: { id: stock.id },
              data: { quantity: newQty },
            });
          }
        }

        await tx.productTransaction.delete({ where: { id: log.id } });
      });
      console.log('Done.');
    } catch (err) {
      console.error(`\nFailed to delete log ${log.id}:`, err.message);
    }
  }

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
