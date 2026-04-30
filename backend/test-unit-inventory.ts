import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Replicate the getUnitInventory query
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
      batch: { select: { batchCode: true } },
      fieldValues: true
    },
    take: 20
  });
  
  console.log(`Items found with useUnitQty: ${items.length}`);
  if (items.length > 0) {
    console.log('Sample items:');
    items.slice(0, 5).forEach(item => {
      // @ts-ignore
      const fv = item.fieldValues?.[0];
      console.log(`  - ${item.slug} (${item.name}) - Batch: ${item.batch?.batchCode || 'None'}`);
      console.log(`    Value: ${JSON.stringify(fv?.value)} (Type of useUnitQty: ${typeof (fv?.value as any)?.useUnitQty})`);
    });
  } else {
    console.log('No items found with useUnitQty=true');
    console.log('Checking if any field values have useUnitQty...');
    
    const anyUnitQty = await prisma.itemFieldValue.findFirst({
      where: {
        value: {
          path: ['useUnitQty'],
          equals: true
        }
      },
      include: {
        item: { select: { slug: true, name: true } },
        field: { select: { name: true, batchId: true } }
      }
    });
    
    if (anyUnitQty) {
      console.log('Found at least one:', anyUnitQty.item.slug, anyUnitQty.value);
    } else {
      console.log('No field values with useUnitQty found at all!');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
