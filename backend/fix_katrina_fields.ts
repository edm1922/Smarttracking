import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const telaBatch = await prisma.batch.findUnique({ where: { batchCode: 'TELA' } });
  const botaBatch = await prisma.batch.findUnique({ where: { batchCode: 'BOTA' } });

  if (!telaBatch || !botaBatch) {
    console.error('TELA or BOTA batch not found');
    return;
  }

  const yardField = await prisma.customField.findFirst({
    where: { name: 'YARD', batchId: telaBatch.id }
  });

  const sizeField = await prisma.customField.findFirst({
    where: { name: 'SIZE', batchId: botaBatch.id }
  });

  if (!yardField || !sizeField) {
    console.error('YARD (TELA) or SIZE (BOTA) field not found');
    return;
  }

  // Find the items
  const items = await prisma.item.findMany({
    where: {
      batchId: botaBatch.id,
      OR: [
        { name: { contains: 'KATRINA', mode: 'insensitive' } },
        { description: { contains: 'KATRINA', mode: 'insensitive' } },
        {
          fieldValues: {
            some: {
              value: { equals: 'KATRINA' }
            }
          }
        }
      ]
    }
  });

  console.log(`Starting migration for ${items.length} items...`);

  for (const item of items) {
    console.log(`Processing item: ${item.slug}`);

    // Get current SIZE value
    const sizeFV = await prisma.itemFieldValue.findFirst({
      where: { itemId: item.id, fieldId: sizeField.id }
    });

    const sizeValue = sizeFV?.value || "150"; // Default to 150 based on investigation if not found

    await prisma.$transaction([
      // Update batch
      prisma.item.update({
        where: { id: item.id },
        data: { batchId: telaBatch.id }
      }),
      // Remove any existing YARD or SIZE values for this item to avoid duplicates
      prisma.itemFieldValue.deleteMany({
        where: {
          itemId: item.id,
          fieldId: { in: [yardField.id, sizeField.id] }
        }
      }),
      // Create new YARD value
      prisma.itemFieldValue.create({
        data: {
          itemId: item.id,
          fieldId: yardField.id,
          value: sizeValue
        }
      })
    ]);

    console.log(`  Updated ${item.slug}: Batch moved to TELA, SIZE moved to YARD.`);
  }

  console.log('Migration complete!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
