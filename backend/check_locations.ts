import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const locations = await prisma.location.findMany();
  console.log('Total locations:', locations.length);
  locations.forEach(l => {
    console.log(`- ${l.name} (${l.id})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
