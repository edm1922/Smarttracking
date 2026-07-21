
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  if (!slug) { console.log('Usage: npx ts-node check-item-logs.ts <slug>'); return; }

  const item = await prisma.item.findFirst({ where: { slug } });
  if (!item) { console.log(`Item ${slug} not found`); return; }

  console.log(`Item: ${item.name} (${item.slug}) id=${item.id}\n`);

  const logs = await prisma.activityLog.findMany({
    where: { itemId: item.id, action: { in: ['STOCK_IN', 'STOCK_OUT'] } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Stock logs (${logs.length}):`);
  for (const l of logs) {
    console.log(`  ${l.action} | qty=${(l.changes as any)?.quantity} | ${l.createdAt.toISOString()} | id=${l.id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
