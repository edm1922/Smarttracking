import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find TELA batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'TELA' },
    include: { customFields: true }
  });
  
  if (!batch) {
    console.log('TELA batch not found');
    return;
  }
  
  // Find UNIT QTY field
  const unitQtyField = batch.customFields.find(f => f.name === 'UNIT QTY');
  if (!unitQtyField) {
    console.log('UNIT QTY field not found');
    return;
  }
  
  console.log('Found UNIT QTY field:', unitQtyField.id);
  
  // Get all field values for this field
  const fieldValues = await prisma.itemFieldValue.findMany({
    where: { fieldId: unitQtyField.id }
  });
  
  console.log(`Found ${fieldValues.length} field values to update`);
  
  let updatedCount = 0;
  for (const fv of fieldValues) {
    const currentValue = fv.value as any;
    
    // Remove the 'main' property to avoid displaying "1 roll"
    // The qty and unit are already in the value object
    const newValue = {
      useUnitQty: currentValue.useUnitQty,
      qty: currentValue.qty,
      unit: currentValue.unit
      // Remove 'main' property
    };
    
    await prisma.itemFieldValue.update({
      where: { id: fv.id },
      data: { value: newValue }
    });
    
    updatedCount++;
    if (updatedCount % 20 === 0) {
      console.log(`Progress: ${updatedCount}/${fieldValues.length} updated`);
    }
  }
  
  console.log(`\nDone! Updated ${updatedCount} field values - removed 'main' property`);
  console.log('Now the display should show just the qty (1) since unit is already set to "roll"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
