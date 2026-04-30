import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check TELA batch items
  const telaBatch = await prisma.batch.findFirst({
    where: { batchCode: 'TELA' }
  });
  
  if (!telaBatch) {
    console.log('TELA batch not found');
    return;
  }
  
  // Items with no name in TELA batch
  const unnamedItems = await prisma.item.findMany({
    where: {
      batchId: telaBatch.id,
      name: null
    },
    select: { id: true, slug: true, name: true }
  });
  
  console.log(`TELA batch items with no name: ${unnamedItems.length}`);
  console.log('Sample slugs (first 5):');
  unnamedItems.slice(0, 5).forEach(item => {
    console.log(`  - ${item.slug} (name: ${item.name})`);
  });
  
  // Total TELA items
  const totalTelaItems = await prisma.item.count({
    where: { batchId: telaBatch.id }
  });
  console.log(`\nTotal TELA items: ${totalTelaItems}`);
  console.log('Items with no name: ${unnamedItems.length}/${totalTelaItems}`);
  console.log('\nThese items will NOT appear in Unit Tracking Hub (by design)');
  console.log('But they still exist in the database with their QR slugs!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
