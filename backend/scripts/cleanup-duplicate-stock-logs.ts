
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Looking for duplicate STOCK_IN / STOCK_OUT ActivityLog entries created within the same minute for the same item...\n');

  const stockLogs = await prisma.activityLog.findMany({
    where: {
      action: { in: ['STOCK_IN', 'STOCK_OUT'] },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${stockLogs.length} total stock logs.\n`);

  const groups = new Map<string, typeof stockLogs>();

  for (const log of stockLogs) {
    const changes = (log.changes ?? {}) as Record<string, unknown>;
    const qty = Number(changes.quantity ?? 0);
    const key = [
      log.itemId ?? 'null',
      log.action,
      qty,
      log.userId,
      new Date(log.createdAt).toISOString().slice(0, 16),
    ].join('|');

    const group = groups.get(key) ?? [];
    group.push(log);
    groups.set(key, group);
  }

  const duplicateIds: string[] = [];
  let duplicateGroups = 0;

  for (const [key, group] of groups) {
    if (group.length > 1) {
      duplicateGroups++;
      const keep = group[0];
      const dupes = group.slice(1);
      console.log(`Duplicate group (${group.length} entries) for key: ${key}`);
      console.log(`  Keeping:  ${keep.id} (createdAt ${keep.createdAt.toISOString()})`);
      for (const d of dupes) {
        console.log(`  Removing: ${d.id} (createdAt ${d.createdAt.toISOString()})`);
        duplicateIds.push(d.id);
      }
    }
  }

  console.log(`\nSummary: ${duplicateGroups} duplicate groups, ${duplicateIds.length} entries to delete.\n`);

  if (duplicateIds.length === 0) {
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
    where: { id: { in: duplicateIds } },
  });

  console.log(`Deleted ${result.count} duplicate log entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
