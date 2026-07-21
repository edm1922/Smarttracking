
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding STOCK_OUT activity logs that duplicate approved pull-out requests...\n');

  const [approvedRequests, stockOutLogs] = await Promise.all([
    prisma.pullOutRequest.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, itemId: true, qty: true, createdAt: true },
    }),
    prisma.activityLog.findMany({
      where: { action: 'STOCK_OUT' },
      select: { id: true, itemId: true, changes: true, createdAt: true },
    }),
  ]);

  console.log(`Found ${approvedRequests.length} approved pull-out requests.`);
  console.log(`Found ${stockOutLogs.length} STOCK_OUT activity logs.\n`);

  const logsToDelete: string[] = [];

  for (const req of approvedRequests) {
    const logQty = Number((req as any).qty);
    const reqTime = new Date(req.createdAt).getTime();

    for (const log of stockOutLogs) {
      if (log.itemId !== req.itemId) continue;
      if (logsToDelete.includes(log.id)) continue;

      const logChanges = (log.changes ?? {}) as Record<string, unknown>;
      const logQtyFromChanges = Number(logChanges.quantity);
      if (logQtyFromChanges !== logQty) continue;

      const logTime = new Date(log.createdAt).getTime();
      if (Math.abs(logTime - reqTime) > 60_000) continue;

      logsToDelete.push(log.id);
      console.log(`  Request ${req.id} (qty=${logQty} @ ${req.createdAt.toISOString()})`);
      console.log(`    -> Removing log ${log.id} (createdAt ${log.createdAt.toISOString()})`);
    }
  }

  console.log(`\nSummary: ${logsToDelete.length} duplicate STOCK_OUT logs to delete.\n`);

  if (logsToDelete.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  process.stdout.write('Proceed with deletion? (y/N) ');
  const answer = await new Promise<string>((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    process.stdin.once('data', (data: Buffer) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });

  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    return;
  }

  const result = await prisma.activityLog.deleteMany({
    where: { id: { in: logsToDelete } },
  });

  console.log(`Deleted ${result.count} duplicate STOCK_OUT log entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
