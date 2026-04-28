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

  console.log(`Found ${items.length} items matching 'HAIRNET'`);
  items.forEach(item => {
    console.log(`Item: ${item.name} (${item.slug})`);
    item.fieldValues.forEach(fv => {
      console.log(`  Field: ${fv.field.name}, Value: ${JSON.stringify(fv.value)}`);
    });
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
