import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get TELA batch ID and YARD field ID using raw SQL
  const batchResult = await prisma.$queryRaw<Array<{id: string}>>`
    SELECT id FROM "Batch" WHERE "batchCode" = 'TELA' LIMIT 1
  `;
  
  if (batchResult.length === 0) {
    console.log('TELA batch not found');
    return;
  }
  const batchId = batchResult[0].id;
  console.log('TELA batch ID:', batchId);
  
  // Get YARD field ID
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
  
  // Count items with YARD = '60'
  const countResult = await prisma.$queryRaw<Array<{count: bigint}>>`
    SELECT COUNT(*) as count
    FROM "ItemFieldValue" ifv
    JOIN "Item" i ON i.id = ifv."itemId"
    WHERE ifv."fieldId" = ${fieldId}
    AND ifv.value::text = '"60"'
    AND i."batchId" = ${batchId}
  `;
  console.log(`Found ${countResult[0].count} items with YARD = '60'`);
  
  // Update them to '150'
  const updateResult = await prisma.$executeRaw`
    UPDATE "ItemFieldValue"
    SET value = '"150"'
    WHERE "fieldId" = ${fieldId}
    AND value::text = '"60"'
    AND EXISTS (
      SELECT 1 FROM "Item" 
      WHERE "Item"."id" = "ItemFieldValue"."itemId" 
      AND "Item"."batchId" = ${batchId}
    )
  `;
  
  console.log(`Done! Updated ${updateResult} items from YARD='60' to YARD='150'`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
