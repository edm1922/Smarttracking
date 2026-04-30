const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for items with unit tracking...');
  
  const allItems = await prisma.item.findMany({
    include: { fieldValues: true }
  });

  console.log(`Total items in database: ${allItems.length}`);

  const unitTrackedItems = allItems.filter(item => 
    item.fieldValues.some(fv => {
      const val = fv.value;
      return val && typeof val === 'object' && val.useUnitQty === true;
    })
  );

  console.log(`Items with useUnitQty: true: ${unitTrackedItems.length}`);

  if (unitTrackedItems.length > 0) {
    console.log('Example unit tracked item:');
    const example = unitTrackedItems[0];
    console.log({
      slug: example.slug,
      name: example.name,
      fieldValues: example.fieldValues.map(fv => ({
        id: fv.id,
        value: fv.value
      }))
    });
  } else {
    console.log('No unit tracked items found in manual scan.');
    if (allItems.length > 0) {
        console.log('First 5 items field values:');
        allItems.slice(0, 5).forEach(item => {
            console.log(`- ${item.slug}:`, JSON.stringify(item.fieldValues.map(fv => fv.value)));
        });
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
