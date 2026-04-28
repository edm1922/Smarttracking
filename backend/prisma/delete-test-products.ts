import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding products with names starting with "Performance Test Product"...');
  
  const products = await prisma.product.findMany({
    where: {
      name: {
        startsWith: 'Performance Test Product',
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
    },
  });

  console.log(`Found ${products.length} products to delete:`);
  products.forEach(p => console.log(`  - ${p.name} (SKU: ${p.sku})`));

  if (products.length === 0) {
    console.log('No products found to delete.');
    return;
  }

  const result = await prisma.product.deleteMany({
    where: {
      name: {
        startsWith: 'Performance Test Product',
      },
    },
  });

  console.log(`Successfully deleted ${result.count} products.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
