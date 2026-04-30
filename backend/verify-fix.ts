import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.batch.findFirst({
    where: { batchCode: 'TELA' },
    include: { customFields: true }
  });
  
  if (!batch) {
    console.log('TELA batch not found');
    return;
  }
  
  const unitQtyField = batch.customFields.find(f => f.name === 'UNIT QTY');
  if (!unitQtyField) {
    console.log('UNIT QTY field not found');
    return;
  }
  
  const sample = await prisma.itemFieldValue.findFirst({
    where: { fieldId: unitQtyField.id },
    include: { item: { select: { slug: true, unit: true } } }
  });
  
  if (!sample) {
    console.log('No field values found');
    return;
  }
  
  console.log('Sample item:', sample.item.slug);
  console.log('Item unit:', sample.item.unit);
  console.log('Field value:', JSON.stringify(sample.value, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
