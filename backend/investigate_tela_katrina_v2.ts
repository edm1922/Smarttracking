import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all items in batch TELA that have KATRINA in name, description or any field value
  const items = await prisma.item.findMany({
    where: {
      batch: { batchCode: 'TELA' },
      OR: [
        { name: { contains: 'KATRINA', mode: 'insensitive' } },
        { description: { contains: 'KATRINA', mode: 'insensitive' } },
        {
          fieldValues: {
            some: {
              value: { equals: 'KATRINA' } // Simplistic check, mode insensitive not supported for Json equals
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

  console.log(`Found ${items.length} KATRINA items in TELA batch.`);

  const allFieldsFound = new Set<string>();
  items.forEach(item => {
    item.fieldValues.forEach(fv => {
      allFieldsFound.add(fv.field.name);
    });
  });

  console.log('All fields found across these items:', Array.from(allFieldsFound));

  const itemsWithSizeField = items.filter(item => 
    item.fieldValues.some(fv => fv.field.name.toLowerCase() === 'size')
  );

  console.log(`\nItems with "SIZE" field: ${itemsWithSizeField.length}`);

  if (itemsWithSizeField.length > 0) {
    const yardField = await prisma.customField.findFirst({
      where: {
        name: { equals: 'YARD', mode: 'insensitive' },
        OR: [
          { batch: { batchCode: 'TELA' } },
          { batchId: null }
        ]
      }
    });

    console.log('YARD field found:', yardField ? `${yardField.name} (${yardField.id})` : 'Not found');

    itemsWithSizeField.slice(0, 5).forEach(item => {
      const sizeFV = item.fieldValues.find(fv => fv.field.name.toLowerCase() === 'size');
      const yardFV = item.fieldValues.find(fv => fv.field.name.toLowerCase() === 'yard');
      console.log(`Item: ${item.slug}`);
      console.log(`  SIZE value: ${JSON.stringify(sizeFV?.value)}`);
      console.log(`  YARD value: ${JSON.stringify(yardFV?.value)}`);
    });
  } else {
    // Maybe the field is named differently but the user sees "size"?
    console.log('\nChecking for any other fields that might be "size":');
    items.slice(0, 3).forEach(item => {
        console.log(`Item: ${item.slug}`);
        item.fieldValues.forEach(fv => {
            console.log(`  ${fv.field.name}: ${JSON.stringify(fv.value)}`);
        });
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
