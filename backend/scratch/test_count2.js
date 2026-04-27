const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dtpjhomraxyezpvwfymv:Tripz0219!!!@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&statement_cache_size=0",
    },
  },
});

async function main() {
  console.log('Testing issuance count logic...');

  const requests = await prisma.internalRequest.findMany({
    where: { status: 'FULFILLED' },
    take: 20,
    select: { id: true, productId: true, employeeName: true, date: true },
    orderBy: { date: 'asc' },
  });

  const issuanceMap = new Map();
  
  requests.forEach((req) => {
    const key = `${req.productId}-${req.employeeName}`;
    const prevCount = issuanceMap.get(key) ?? 0;
    issuanceMap.set(key, prevCount + 1);
  });

  console.log('\nRequests with calculated previousIssuancesCount:');
  
  let prev = null;
  requests.forEach((r, i) => {
    const key = `${r.productId}-${r.employeeName}`;
    const prevCount = (issuanceMap.get(key) ?? 1) - 1;
    
    if (prev !== r.employeeName) {
      console.log(`\n--- ${r.employeeName} ---`);
      prev = r.employeeName;
    }
    
    console.log(`  ${i+1}. date=${r.date.toISOString().split('T')[0]}, prevCount=${prevCount}`);
  });

  console.log('\n\nFull employee example:');
  
  const empRequests = requests.filter(r => r.employeeName === 'PAGALAN ANGELITO');
  
  empRequests.forEach((r, i) => {
    const key = `${r.productId}-${r.employeeName}`;
    const prevCount = (issuanceMap.get(key) ?? 1) - 1;
    console.log(`  ${i+1}. prev=${prevCount} => display: ${prevCount + 1 === 1 ? 'First' : (prevCount + 1) + 'th'}`);
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