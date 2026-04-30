import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find TELA batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'TELA' },
    include: { 
      customFields: true, 
      items: { 
        select: { id: true }
      }
    }
  });
  
  if (!batch) {
    console.log('TELA batch not found');
    return;
  }
  
  console.log(`Found TELA batch with ${batch.items.length} items`);
  
  // Get or create UNIT QTY field
  let unitQtyField = batch.customFields.find(f => f.name === 'UNIT QTY');
  
  if (!unitQtyField) {
    console.log('Creating UNIT QTY custom field...');
    unitQtyField = await prisma.customField.create({
      data: {
        name: 'UNIT QTY',
        fieldType: 'text',
        batchId: batch.id,
        required: false,
        orderIndex: 100
      }
    });
    console.log('Created UNIT QTY field:', unitQtyField.id);
  } else {
    console.log('Found existing UNIT QTY field:', unitQtyField.id);
  }
  
  // Batch update all items' unit to 'roll'
  console.log('\nUpdating all items unit to "roll"...');
  const unitUpdateResult = await prisma.item.updateMany({
    where: { batchId: batch.id },
    data: { unit: 'roll' }
  });
  console.log(`Updated ${unitUpdateResult.count} items with unit='roll'`);
  
  // Delete existing field values for this field (clean slate)
  console.log('\nCleaning existing field values...');
  const deleteResult = await prisma.itemFieldValue.deleteMany({
    where: { fieldId: unitQtyField.id }
  });
  console.log(`Deleted ${deleteResult.count} existing field values`);
  
  // Create field values in batches
  console.log('\nCreating field values for all items...');
  const unitQtyValue = {
    useUnitQty: true,
    qty: 1,
    unit: 'roll',
    main: '1 roll'
  };
  
  const batchSize = 50;
  let createdCount = 0;
  
  for (let i = 0; i < batch.items.length; i += batchSize) {
    const chunk = batch.items.slice(i, i + batchSize);
    
    await prisma.itemFieldValue.createMany({
      data: chunk.map(item => ({
        itemId: item.id,
        fieldId: unitQtyField.id,
        value: unitQtyValue
      }))
    });
    
    createdCount += chunk.length;
    console.log(`Progress: ${createdCount}/${batch.items.length} field values created`);
  }
  
  console.log(`\nDone! Created ${createdCount} field values for unit tracking`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
