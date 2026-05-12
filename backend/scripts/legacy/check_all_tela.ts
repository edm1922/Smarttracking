import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: {
      batch: { batchCode: 'TELA' }
    },
    include: {
      fieldValues: {
        include: {
          field: true
        }
      }
    }
  });

  console.log(`Total items in TELA batch: ${items.length}`);

  const allFieldsFound = new Set<string>();
  items.forEach(item => {
    item.fieldValues.forEach(fv => {
      allFieldsFound.add(fv.field.name);
    });
  });

  console.log('All fields found in TELA batch:', Array.from(allFieldsFound));

  const itemsWithSize = items.filter(item => 
    item.fieldValues.some(fv => fv.field.name.toUpperCase() === 'SIZE')
  );

  console.log(`Items with "SIZE" field: ${itemsWithSize.length}`);
  
  if (itemsWithSize.length > 0) {
    itemsWithSize.slice(0, 5).forEach(item => {
        const sizeFV = item.fieldValues.find(fv => fv.field.name.toUpperCase() === 'SIZE');
        const yardFV = item.fieldValues.find(fv => fv.field.name.toUpperCase() === 'YARD');
        console.log(`Item: ${item.slug} (Name: ${item.name})`);
        console.log(`  SIZE: ${JSON.stringify(sizeFV?.value)}`);
        console.log(`  YARD: ${JSON.stringify(yardFV?.value)}`);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
