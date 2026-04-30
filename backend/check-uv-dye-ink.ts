import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Search for UV DYE INK in Products
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'UV DYE INK', mode: 'insensitive' }
    },
    select: { id: true, name: true, sku: true }
  });
  
  if (!product) {
    console.log('Product "UV DYE INK" not found');
  } else {
    console.log('Found Product:', product.name, `(${product.sku})`);
    
    // Check if there are items linked to this product (via unit tracking)
    const items = await prisma.item.findMany({
      where: {
        name: { contains: 'UV DYE INK', mode: 'insensitive' }
      },
      select: {
        id: true,
        slug: true,
        name: true,
        batch: { select: { batchCode: true } },
        fieldValues: {
          where: {
            value: {
              path: ['useUnitQty'],
              equals: true
            }
          }
        }
      }
    });
    
    console.log(`Found ${items.length} items with name containing "UV DYE INK"`);
    items.forEach(item => {
      console.log(`  - ${item.slug} (${item.name}) - Batch: ${item.batch?.batchCode || 'None'}`);
      console.log(`    Unit tracking enabled: ${item.fieldValues.length > 0}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
