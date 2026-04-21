const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const productCount = await prisma.product.count();
  const prCount = await prisma.purchaseRequest.count();
  const locCount = await prisma.location.count();
  const stockCount = await prisma.productStock.count();

  console.log('Products:', productCount);
  console.log('Purchase Requests:', prCount);
  console.log('Locations:', locCount);
  console.log('Stocks:', stockCount);
}

check().finally(() => prisma.$disconnect());
