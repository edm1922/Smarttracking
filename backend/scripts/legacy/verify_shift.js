const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dtpjhomraxyezpvwfymv:Tripz0219!!!@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&statement_cache_size=0",
    },
  },
});

async function main() {
  console.log('Checking shift distribution for legacy imports...');

  const results = await prisma.$queryRaw`
    SELECT shift, COUNT(*) as count
    FROM "InternalRequest"
    WHERE "supervisor" = 'LEGACY IMPORT'
    GROUP BY shift
    ORDER BY count DESC
  `;

  console.log('\nShift distribution:');
  console.table(results);

  console.log('\nSample records with department and shift:');
  const samples = await prisma.$queryRaw`
    SELECT "employeeName", "departmentArea", shift
    FROM "InternalRequest"
    WHERE "supervisor" = 'LEGACY IMPORT'
    LIMIT 10
  `;
  
  console.table(samples);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });