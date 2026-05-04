import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sizeFieldId = '803a5678-75ff-4a3d-b34a-de993e453664';
  const yardFieldId = '2fbfb668-9418-42ff-b32b-d2d6253f1088';

  const itemsWithValues = await prisma.itemFieldValue.findMany({
    where: {
      fieldId: sizeFieldId,
      item: {
        batch: { batchCode: 'TELA' }
      }
    },
    include: {
      item: true
    }
  });

  console.log(`Found ${itemsWithValues.length} items in batch TELA that have a value for the APPAREL "SIZE" field.`);

  itemsWithValues.forEach(fv => {
    console.log(`- Item: ${fv.item.slug} (Name: ${fv.item.name}), Value: ${JSON.stringify(fv.value)}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
