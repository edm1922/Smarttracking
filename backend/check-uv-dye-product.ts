import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check total products
  const total = await prisma.product.count();
  console.log('Total products in database:', total);
  
  // Check if UV DYE INK exists
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'UV DYE', mode: 'insensitive' }
    },
    select: { id: true, name: true, sku: true }
  });
  
  if (product) {
    console.log('Found product:', product);
  } else {
    console.log('UV DYE INK not found in products');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
