import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slugs = [
    'TEL-78LR9', 'TEL-A6KQ0', 'TEL-I6O9C', 'TEL-4C3QO', 
    'TEL-XF8OF', 'TEL-K1HUA', 'TEL-0ZE1E', 'TEL-D4C8D', 
    'TEL-3XL0Y', 'TEL-2ZGQW', 'TEL-4HUNW', 'TEL-K444W'
  ];

  const items = await prisma.item.findMany({
    where: { slug: { in: slugs } },
    include: {
      batch: true,
      fieldValues: {
        include: {
          field: true
        }
      }
    }
  });

  console.log(`Verifying ${items.length} items...`);

  items.forEach(item => {
    const batchCode = item.batch?.batchCode;
    const yardFV = item.fieldValues.find(fv => fv.field.name === 'YARD');
    const sizeFV = item.fieldValues.find(fv => fv.field.name === 'SIZE');

    console.log(`Item: ${item.slug}`);
    console.log(`  Batch: ${batchCode} ${batchCode === 'TELA' ? '✅' : '❌'}`);
    console.log(`  YARD field: ${yardFV ? 'Found (Value: ' + JSON.stringify(yardFV.value) + ') ✅' : 'Missing ❌'}`);
    console.log(`  SIZE field: ${sizeFV ? 'Found ❌' : 'Missing ✅'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
