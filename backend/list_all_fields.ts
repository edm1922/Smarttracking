import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.customField.findMany({
    include: { batch: true }
  });
  console.log('All Custom Fields:');
  fields.forEach(f => {
    console.log(`- ${f.name} (Batch: ${f.batch?.batchCode || 'GLOBAL'}, ID: ${f.id})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
