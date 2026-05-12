import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestBatch = await prisma.storageBatch.findFirst({
    orderBy: { created_at: 'desc' },
    include: {
      _count: {
        select: { documents: true }
      }
    }
  });

  if (!latestBatch) {
    console.log('No batches found.');
    return;
  }

  console.log(`Latest Batch ID: ${latestBatch.id}`);
  console.log(`Label: ${latestBatch.label}`);
  console.log(`Document Count: ${latestBatch._count.documents}`);

  const docs = await prisma.document.findMany({
    where: { batch_id: latestBatch.id },
    take: 20,
    select: {
      sys_id: true,
      file_name: true
    }
  });

  console.log('\nSample Documents:');
  docs.forEach(d => {
    console.log(`ID: ${d.sys_id} | File: ${d.file_name}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
