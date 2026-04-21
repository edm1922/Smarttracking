const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const item = await prisma.item.create({
      data: {
        name: 'TEST ITEM',
        slug: 'TEL-DEBUG-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        status: 'Available',
        categoryId: null,
        batchId: null,
      },
    });
    console.log('SUCCESS:', item);
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
