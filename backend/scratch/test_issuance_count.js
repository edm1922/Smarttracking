const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dtpjhomraxyezpvwfymv:Tripz0219!!!@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&statement_cache_size=0",
    },
  },
});

async function main() {
  console.log('Testing issuance count...');

  const allIssuances = await prisma.internalRequest.findMany({
    where: { status: 'FULFILLED' },
    select: { id: true, productId: true, employeeName: true, date: true },
    orderBy: { date: 'asc' },
  });

  const issuanceMap = new Map();
  
  allIssuances.forEach((req) => {
    const key = `${req.productId}-${req.employeeName}`;
    const prevCount = issuanceMap.get(key) ?? 0;
    issuanceMap.set(key, prevCount + 1);
  });

  console.log('Sample of employee issuance order:');
  
  const testEmployee = 'PAGALAN ANGELITO';
  const testProduct = 'BALLPEN';
  
  const relevantRequests = allIssuances
    .filter(r => r.employeeName === testEmployee)
    .slice(0, 5);
    
  console.log(`\n${testEmployee} requests for BALLPEN:`);
  
  let count = 0;
  relevantRequests.forEach(r => {
    count++;
    console.log(`  ${count}. ${r.date}`);
  });

  console.log('\n\nFull chronological test for another employee:');
  
  const emp2 = 'DOMINGO, MARVIN';
  const emp2Requests = allIssuances
    .filter(r => r.employeeName === emp2)
    .slice(0, 10);
    
  console.log(`\n${emp2} requests (chronological):`);
  
  let c = 0;
  emp2Requests.forEach(r => {
    c++;
    console.log(`  ${c}. ${r.date}`);
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