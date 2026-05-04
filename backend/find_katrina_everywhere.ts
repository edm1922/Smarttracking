import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { name: { contains: 'KATRINA', mode: 'insensitive' } },
        { description: { contains: 'KATRINA', mode: 'insensitive' } },
        {
          fieldValues: {
            some: {
              value: { equals: 'KATRINA' }
            }
          }
        }
      ]
    },
    include: {
      batch: true,
      fieldValues: {
        include: {
          field: true
        }
      }
    }
  });

  console.log(`Found ${items.length} items matching KATRINA.`);
  
  const batchesFound = new Set<string>();
  items.forEach(item => {
    batchesFound.add(item.batch?.batchCode || 'NO BATCH');
  });
  console.log('Batches these items belong to:', Array.from(batchesFound));

  items.slice(0, 10).forEach(item => {
    console.log(`Item: ${item.slug}, Batch: ${item.batch?.batchCode}`);
    const sizeFields = item.fieldValues.filter(fv => fv.field.name.toLowerCase().includes('size'));
    if (sizeFields.length > 0) {
      console.log('  Size fields found:');
      sizeFields.forEach(sf => {
        console.log(`    - ${sf.field.name} (Value: ${JSON.stringify(sf.value)}, Batch: ${sf.field.batchId ? 'HAS BATCH' : 'GLOBAL'})`);
      });
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
