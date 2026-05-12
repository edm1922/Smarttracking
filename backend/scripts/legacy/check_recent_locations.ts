import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recentRequests = await prisma.internalRequest.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { location: true, targetLocation: true }
  });

  const sourceLocations = new Set();
  const targetLocations = new Set();

  recentRequests.forEach(r => {
    sourceLocations.add(r.location?.name);
    if (r.targetLocation) targetLocations.add(r.targetLocation.name);
  });

  console.log('Source locations used in last 50 requests:', Array.from(sourceLocations));
  console.log('Target locations used in last 50 requests:', Array.from(targetLocations));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
