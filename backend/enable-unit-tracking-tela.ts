import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find TELA batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'TELA' },
    include: { 
      customFields: true, 
      items: { 
        select: { id: true, slug: true, unit: true, trackingType: true },
      }
    }
  });
  
  if (!batch) {
    console.log('TELA batch not found');
    return;
  }
  
  console.log(`Found TELA batch with ${batch.items.length} items`);
  console.log(`Current unit values: ${[...new Set(batch.items.map(i => i.unit))].join(', ')}`);
  
  // Check if there's already a custom field for unit tracking
  // The unit tracking seems to use a field with value containing useUnitQty
  let unitTrackingField = batch.customFields.find(f => {
    // Check if any item has a field value with useUnitQty for this field
    return false; // We'll create one if needed
  });
  
  // For unit tracking, we need a field that will store the unit qty info
  // Let's create a custom field for unit tracking if it doesn't exist
  let unitQtyField = await prisma.customField.findFirst({
    where: {
      batchId: batch.id,
      name: { contains: 'UNIT', mode: 'insensitive' }
    }
  });
  
  if (!unitQtyField) {
    console.log('Creating UNIT QTY custom field for TELA batch...');
    unitQtyField = await prisma.customField.create({
      data: {
        name: 'UNIT QTY',
        fieldType: 'text', // Will store JSON with useUnitQty, qty, unit
        batchId: batch.id,
        required: false,
        orderIndex: 100
      }
    });
    console.log('Created UNIT QTY field:', unitQtyField.id);
  } else {
    console.log('Found existing UNIT QTY field:', unitQtyField.id);
  }
  
  // Update all items in TELA batch
  console.log('\nUpdating items...');
  let updatedCount = 0;
  let fieldValueCount = 0;
  
  for (const item of batch.items) {
    // Update item unit to 'roll'
    await prisma.item.update({
      where: { id: item.id },
      data: { unit: 'roll' }
    });
    updatedCount++;
    
    // Check if item already has a field value for unit tracking
    const existingFieldValue = await prisma.itemFieldValue.findFirst({
      where: {
        itemId: item.id,
        fieldId: unitQtyField.id
      }
    });
    
    const unitQtyValue = {
      useUnitQty: true,
      qty: 1,
      unit: 'roll',
      main: '1 roll'
    };
    
    if (existingFieldValue) {
      // Update existing field value
      await prisma.itemFieldValue.update({
        where: { id: existingFieldValue.id },
        data: { value: unitQtyValue }
      });
    } else {
      // Create new field value
      await prisma.itemFieldValue.create({
        data: {
          itemId: item.id,
          fieldId: unitQtyField.id,
          value: unitQtyValue
        }
      });
      fieldValueCount++;
    }
    
    if (updatedCount % 20 === 0) {
      console.log(`Progress: ${updatedCount}/${batch.items.length} items updated`);
    }
  }
  
  console.log(`\nDone! Updated ${updatedCount} items with unit='roll'`);
  console.log(`Created ${fieldValueCount} new field values for unit tracking`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
