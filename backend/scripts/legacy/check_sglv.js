const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { name: { contains: 'SG-LV', mode: 'insensitive' } },
        { slug: { contains: 'SG-LV', mode: 'insensitive' } }
      ]
    },
    include: {
      fieldValues: {
        include: { field: true }
      }
    }
  });

  console.log(`Found ${items.length} items matching 'SG-LV'`);
  items.forEach(item => {
    console.log(`Item: ${item.name} (${item.slug})`);
    const unitField = item.fieldValues.find(fv => {
        const val = fv.value;
        return val && typeof val === 'object' && val.useUnitQty === true;
    });
    console.log(`  Has Unit Tracking: ${!!unitField}`);
    if (unitField) console.log(`  Unit Value: ${JSON.stringify(unitField.value)}`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
