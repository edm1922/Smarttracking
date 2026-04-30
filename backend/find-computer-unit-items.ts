import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find COMPUTER/PERIPHERALS batch
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'COMPUTER/PERIPHERALS' }
  });
  
  if (!batch) {
    console.log('Batch not found');
    return;
  }
  
  console.log('Checking all items in COMPUTER/PERIPHERALS batch...');
  console.log('Batch ID:', batch.id);
  
  // Get ALL items in this batch with their field values
  const items = await prisma.item.findMany({
    where: { batchId: batch.id },
    include: {
      fieldValues: {
        include: { field: true }
      }
    }
  });
  
  console.log(`Total items in batch: ${items.length}`);
  
  // Check each item's field values for useUnitQty
  let itemsWithUnitQty = 0;
  items.forEach(item => {
    item.fieldValues.forEach(fv => {
      const val = fv.value as any;
      if (val && typeof val === 'object' && val.useUnitQty === true) {
        itemsWithUnitQty++;
        console.log(`\nFound item with useUnitQty: ${item.slug}`);
        console.log(`  Field: ${fv.field.name}`);
        console.log(`  Value:`, val);
      }
    });
  });
  
  console.log(`\nTotal items with useUnitQty in COMPUTER/PERIPHERALS: ${itemsWithUnitQty}`);
  
  // Also check if there's a UNIT QTY field with batchId null (global)
  const globalUnitQty = await prisma.customField.findFirst({
    where: {
      name: 'UNIT QTY',
      batchId: null
    }
  });
  
  if (globalUnitQty) {
    console.log('\nFound GLOBAL UNIT QTY field - this applies to ALL batches!');
    console.log('Field ID:', globalUnitQty.id);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
