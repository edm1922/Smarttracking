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
  
  console.log('Found TELA batch with', batch.customFields.length, 'custom fields');
  
  // Find the YARD field
  const yardField = batch.customFields.find(f => f.name === 'YARD');
  if (!yardField) {
    console.log('YARD field not found in TELA batch');
    return;
  }
  
  console.log('YARD field ID:', yardField.id);
  
  // Find all items with YARD = '60' using raw JSON query
  const itemsWith60Yards = await prisma.itemFieldValue.findMany({
    where: {
      fieldId: yardField.id,
      value: '60'
    },
    include: {
      item: { select: { slug: true, batchId: true } }
    }
  });
  
  console.log(`Found ${itemsWith60Yards.length} items with YARD = '60'`);
  
  if (itemsWith60Yards.length === 0) {
    console.log('No items to update');
    return;
  }
  
  // Update them to '150' using raw SQL for JSON update
  console.log('\nUpdating items from YARD="60" to YARD="150"...');
  
  const result = await prisma.$executeRaw`
    UPDATE "ItemFieldValue"
    SET value = '"150"'
    WHERE "fieldId" = ${yardField.id}
    AND value::text = '"60"'
    AND EXISTS (
      SELECT 1 FROM "Item" 
      WHERE "Item"."id" = "ItemFieldValue"."itemId" 
      AND "Item"."batchId" = ${batch.id}
    )
  `;
  
  console.log(`Done! Updated ${result} items from YARD='60' to YARD='150'`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
