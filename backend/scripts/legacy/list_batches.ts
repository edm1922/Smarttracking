import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.batch.findMany({
    select: { batchCode: true }
  });
  console.log('Available batches:', batches.map(b => b.batchCode));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
