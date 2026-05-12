const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dtpjhomraxyezpvwfymv:Tripz0219!!!@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&statement_cache_size=0",
    },
  },
});

async function main() {
  console.log('Testing fixed issuance count logic...');

  const allIssuances = await prisma.internalRequest.findMany({
    where: { status: 'FULFILLED' },
    select: { id: true, productId: true, employeeName: true, date: true },
    orderBy: { date: 'asc' },
  });

  const productIds = new Map();
  allIssuances.forEach(r => {
    if (!productIds.has(r.productId)) {
      productIds.set(r.productId, r.employeeName);
    }
  });

  const issuanceCounts = new Map();
  allIssuances.forEach((req) => {
    const key = `${req.productId}-${req.employeeName}`;
    if (!issuanceCounts.has(key)) {
      issuanceCounts.set(key, []);
    }
    issuanceCounts.get(key)?.push(req.id);
  });

  console.log('\n--- PAGALAN ANGELITO example ---');
  
  const empRequests = allIssuances.filter(r => r.employeeName === 'PAGALAN ANGELITO');
  console.log(`Found ${empRequests.length} records`);
  
  empRequests.forEach((r, i) => {
    console.log(`  ${i + 1}. productId: ${r.productId.substring(0,8)} date: ${r.date.toISOString().split('T')[0]} => prev=${i}, display: ${i === 0 ? 'First' : i + 'th'}`);
  });

  console.log('\n--- DOMINGO, MARVIN example ---');
  
  const domingoRequests = allIssuances.filter(r => r.employeeName === 'DOMINGO, MARVIN');
  console.log(`Found ${domingoRequests.length} records`);
  
  domingoRequests.forEach((r, i) => {
    console.log(`  ${i + 1}. productId: ${r.productId.substring(0,8)} date: ${r.date.toISOString().split('T')[0]} => prev=${i}, display: ${i === 0 ? 'First' : i + 'th'}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });