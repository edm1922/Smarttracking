const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      sku: { in: ['ITM-299', 'ITM-281'] }
    },
    select: {
      sku: true,
      name: true,
      description: true
    }
  });
  console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
