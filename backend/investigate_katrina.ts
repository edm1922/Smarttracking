import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.batch.findUnique({
    where: { batchCode: 'KATRINA' },
    include: {
      CustomField: true,
      items: {
        include: {
          fieldValues: {
            include: {
              field: true
            }
          }
        }
      }
    }
  });

  if (!batch) {
    console.log('Batch KATRINA not found');
    return;
  }

  console.log('Batch found:', batch.batchCode, 'ID:', batch.id);
  console.log('Custom Fields for this batch:');
  batch.CustomField.forEach(f => {
    console.log(`- ${f.name} (ID: ${f.id}, Type: ${f.fieldType})`);
  });

  const sizeField = batch.CustomField.find(f => f.name.toLowerCase() === 'size');
  const yardField = batch.CustomField.find(f => f.name.toLowerCase() === 'yard');

  console.log('\nField details:');
  console.log('Size Field:', sizeField ? sizeField.id : 'Not found');
  console.log('Yard Field:', yardField ? yardField.id : 'Not found');

  // Sample check of some items
  console.log('\nSample items field values (first 5):');
  batch.items.slice(0, 5).forEach(item => {
    console.log(`Item: ${item.slug}`);
    item.fieldValues.forEach(fv => {
      console.log(`  ${fv.field.name}: ${JSON.stringify(fv.value)}`);
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
