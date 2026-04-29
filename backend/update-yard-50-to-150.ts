import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get TELA batch and YARD field using raw SQL
  const batchResult = await prisma.$queryRaw<Array<{id: string}>>`
    SELECT id FROM "Batch" WHERE "batchCode" = 'TELA' LIMIT 1
  `;
  
  if (batchResult.length === 0) {
    console.log('TELA batch not found');
    return;
  }
  const batchId = batchResult[0].id;
  
  const fieldResult = await prisma.$queryRaw<Array<{id: string}>>`
    SELECT id FROM "CustomField" 
    WHERE "batchId" = ${batchId} AND name = 'YARD' 
    LIMIT 1
  `;
  
  if (fieldResult.length === 0) {
    console.log('YARD field not found');
    return;
  }
  const fieldId = fieldResult[0].id;
  console.log('YARD field ID:', fieldId);
  
  // Update YARD = '50' to '150'
  const updateResult = await prisma.$executeRaw`
    UPDATE "ItemFieldValue"
    SET value = '"150"'
    WHERE "fieldId" = ${fieldId}
    AND value::text = '"50"'
    AND EXISTS (
      SELECT 1 FROM "Item" 
      WHERE "Item"."id" = "ItemFieldValue"."itemId" 
      AND "Item"."batchId" = ${batchId}
    )
  `;
  
  console.log(`Done! Updated ${updateResult} items from YARD='50' to YARD='150'`);
  
  // Verify final distribution
  const yardValues = await prisma.$queryRaw<Array<{value: string, count: bigint}>>`
    SELECT value, COUNT(*) as count
    FROM "ItemFieldValue"
    WHERE "fieldId" = ${fieldId}
    GROUP BY value
    ORDER BY value
  `;
  
  console.log('\nFinal YARD values distribution:');
  yardValues.forEach(v => {
    console.log(`  "${v.value}": ${v.count} items`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
