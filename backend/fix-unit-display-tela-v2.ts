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
  
  // Use raw SQL for faster update - remove 'main' property from all JSON values
  console.log('Updating field values using raw SQL...');
  
  const result = await prisma.$executeRaw`
    UPDATE "ItemFieldValue"
    SET value = jsonb_set(value::jsonb, '{main}', 'null'::jsonb) - 'main'
    WHERE "fieldId" = ${unitQtyField.id}
    AND value::jsonb ? 'main'
  `;
  
  console.log(`Done! Updated ${result} field values - removed 'main' property`);
  console.log('Now the display should show just the qty (1) since unit is already set to "roll"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
