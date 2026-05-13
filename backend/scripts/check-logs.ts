import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productNames = ['APRON', 'BOTA-W', 'BULLCAP', 'HAIRNET-W', 'HOODCAP', 'KATRINA', 'MASK-W'];
  
  for (const name of productNames) {
    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { product: { name: { contains: name, mode: 'insensitive' } } },
          { item: { name: { contains: name, mode: 'insensitive' } } }
        ]
      },
      include: { product: true, item: true }
    });
    console.log(`Product: ${name} | Total Logs found: ${logs.length}`);
    if (logs.length > 0) {
       const actions = [...new Set(logs.map(l => l.action))];
       console.log(` - Actions: ${actions.join(', ')}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
