import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check UV DYE INK product and its stock
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'UV DYE', mode: 'insensitive' }
    },
    include: {
      stocks: {
        include: { location: { select: { id: true, name: true } }
      }
    }
  });
  
  if (!product) {
    console.log('Product not found');
    return;
  }
  
  console.log('Product:', product.name, `(${product.sku})`);
  console.log('Stocks:');
  if (product.stocks.length === 0) {
    console.log('  No stock records found');
  } else {
    product.stocks.forEach((s: any) => {
      console.log(`  - ${s.location.name}: ${s.quantity}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
