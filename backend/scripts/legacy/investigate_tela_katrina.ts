import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.batch.findUnique({
    where: { batchCode: 'TELA' },
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
    console.log('Batch TELA not found');
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
  console.log('Size Field:', sizeField ? `${sizeField.name} (${sizeField.id})` : 'Not found');
  console.log('Yard Field:', yardField ? `${yardField.name} (${yardField.id})` : 'Not found');

  // Filter items where "Reference Name" or similar is "KATRINA"
  const katrinaItems = batch.items.filter(item => {
    return item.fieldValues.some(fv => 
      fv.field.name.toLowerCase().includes('reference') && 
      typeof fv.value === 'string' && 
      fv.value.toUpperCase().includes('KATRINA')
    );
  });

  console.log(`\nFound ${katrinaItems.length} items with KATRINA in reference fields.`);
  
  if (katrinaItems.length > 0) {
    console.log('\nSample KATRINA item field values (first 3):');
    katrinaItems.slice(0, 3).forEach(item => {
      console.log(`Item: ${item.slug}`);
      item.fieldValues.forEach(fv => {
        console.log(`  ${fv.field.name}: ${JSON.stringify(fv.value)}`);
      });
    });
  } else {
    // If no KATRINA found in reference, maybe KATRINA is the description or name?
    console.log('Checking name/description for KATRINA...');
    const katrinaItemsByName = batch.items.filter(item => 
      (item.name?.toUpperCase().includes('KATRINA')) || 
      (item.description?.toUpperCase().includes('KATRINA'))
    );
    console.log(`Found ${katrinaItemsByName.length} items with KATRINA in name/description.`);
    katrinaItemsByName.slice(0, 3).forEach(item => {
      console.log(`Item: ${item.slug} (Name: ${item.name})`);
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
