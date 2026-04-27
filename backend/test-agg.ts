import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('Testing aggregation query...');
  
  const issuanceCounts = await prisma.internalRequest.groupBy({
    by: ['productId', 'employeeName'],
    where: { status: 'FULFILLED' },
    _count: { productId: true },
  });

  const issuanceMap = new Map();
  issuanceCounts.forEach((i) => {
    issuanceMap.set(`${i.productId}-${i.employeeName}`, i._count.productId);
  });

  console.log('Issuance Counts (Raw DB Response):');
  console.log(JSON.stringify(issuanceCounts, null, 2));

  // Fetch a sample of 2 requests to show how it's mapped
  const requests = await prisma.internalRequest.findMany({
    take: 2,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true } },
    },
  });

  const mappedRequests = requests.map((req) => {
    const prevCount = issuanceMap.get(`${req.productId}-${req.employeeName}`) || 0;
    return { ...req, previousIssuancesCount: prevCount };
  });

  console.log('\nMapped Requests Sample:');
  console.log(JSON.stringify(mappedRequests, null, 2));

  await prisma.$disconnect();
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
