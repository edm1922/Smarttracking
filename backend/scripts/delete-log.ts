
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  if (!id) { console.log('Usage: npx ts-node delete-log.ts <logId>'); return; }

  const log = await prisma.activityLog.findUnique({ where: { id } });
  if (!log) { console.log(`Log ${id} not found`); return; }

  console.log(`Deleting: ${log.action} qty=${(log.changes as any)?.quantity} createdAt=${log.createdAt.toISOString()}`);
  await prisma.activityLog.delete({ where: { id } });
  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
