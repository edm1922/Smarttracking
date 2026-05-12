const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const where = {
        fieldValues: {
            some: {
                value: {
                    path: ['useUnitQty'],
                    equals: true
                }
            }
        }
    };

    const items = await prisma.item.findMany({
        where,
        select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            batch: { select: { batchCode: true } },
            fieldValues: {
                select: {
                    fieldId: true,
                    value: true,
                    field: { select: { name: true } }
                }
            }
        },
        orderBy: { name: 'asc' },
    });

    console.log(`Prisma found ${items.length} items`);

    const inventory = {};
    
    items.forEach(item => {
      const unitField = item.fieldValues.find(fv => {
        const val = fv.value;
        // The service logic uses: val && typeof val === 'object' && val.useUnitQty === true
        return val && typeof val === 'object' && val.useUnitQty === true;
      });
      
      if (!unitField) {
          console.log(`Skipping ${item.slug} because unitField not found in fieldValues. Values:`, JSON.stringify(item.fieldValues.map(fv => fv.value)));
          return;
      }
      
      const val = unitField.value;
      const name = item.name || 'Unnamed Product';
      const qty = val.qty || 0;
      const unit = val.unit || 'Units';

      if (!inventory[name]) {
        inventory[name] = {
          name,
          totalQty: 0,
          unit,
          items: []
        };
      }

      inventory[name].totalQty += qty;
      inventory[name].items.push({ slug: item.slug, qty });
    });

    const result = Object.values(inventory);
    console.log(`Grouped inventory has ${result.length} entries`);
    if (result.length > 0) {
        console.log('First group:', JSON.stringify(result[0], null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
