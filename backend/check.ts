import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.internalRequest.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Status counts:', groups);
}

main().catch(console.error).finally(() => prisma.$disconnect());
