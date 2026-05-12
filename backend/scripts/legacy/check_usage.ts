import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.internalRequest.count();
  console.log('Total internal requests:', requests);
  
  const stocks = await prisma.productStock.findMany({
    include: { location: true }
  });
  console.log('Total stock entries:', stocks.length);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
