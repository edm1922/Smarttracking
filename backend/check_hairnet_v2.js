const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const items = await prisma.item.findMany({
    where: {
      name: { contains: 'HAIRNET', mode: 'insensitive' }
    },
    include: {
      fieldValues: {
        include: { field: true }
      }
    }
  });

  console.log(JSON.stringify(items, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
