import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find items that have KATRINA and are in BOTA batch
  const items = await prisma.item.findMany({
    where: {
      batch: { batchCode: 'BOTA' },
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
      fieldValues: {
        include: {
          field: true
        }
      }
    }
  });

  console.log(`Found ${items.length} items with KATRINA in BOTA batch.`);

  items.forEach(item => {
    const sizeVal = item.fieldValues.find(fv => fv.field.name === 'SIZE')?.value;
    console.log(`- Item: ${item.slug}, Name: ${item.name}, SIZE value: ${JSON.stringify(sizeVal)}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
