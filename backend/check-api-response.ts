import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Replicate the getUnitInventory logic
  const items = await prisma.item.findMany({
    where: {
      fieldValues: {
        some: {
          value: {
            path: ['useUnitQty'],
            equals: true
          }
        }
      }
    },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      batch: { select: { batchCode: true } },
      fieldValues: {
        select: {
          fieldId: true,
          value: true,
          field: { select: { name: true } }
        }
      }
    },
    orderBy: { name: 'asc' },
  });
  
  console.log(`Total items with unit tracking: ${items.length}`);
  
  // Group by batch
  const byBatch: Record<string, any[]> = {};
  items.forEach(item => {
    const batchName = item.batch?.batchCode || 'No Batch';
    if (!byBatch[batchName]) byBatch[batchName] = [];
    byBatch[batchName].push({
      slug: item.slug,
      name: item.name,
      unitField: item.fieldValues.find(fv => (fv.value as any)?.useUnitQty)?.field?.name
    });
  });
  
  console.log('\nItems by batch:');
  Object.entries(byBatch).forEach(([batch, items]) => {
    console.log(`\n${batch}: ${items.length} items`);
    items.slice(0, 3).forEach(item => {
      console.log(`  - ${item.slug} (${item.name}) - Unit field: ${item.unitField}`);
    });
    if (items.length > 3) console.log(`  ... and ${items.length - 3} more`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
