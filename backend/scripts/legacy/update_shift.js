const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dtpjhomraxyezpvwfymv:Tripz0219!!!@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&statement_cache_size=0",
    },
  },
});

const shiftMap = {
  'PRODUCTION': '307',
  'PRODUCTION 307': '307',
  'PRODUCTION 603': '603',
  'SANITATION TUNE 3': '603',
  'SANITATION MP': '603',
  'SANITATION': '603',
  'TB-LOINING': '603',
  'LOINING LOCAL': '603',
  'CAN LABELLING WAREHOUSE': '307',
  'CAN LABELLING T3': '603',
  'MAKAR VAAS': '307',
  'TUNA 3 PACKING LOCAL': '603',
  'PACKING LOCAL': '603',
  'PACKING LOCAL L-G': '603',
  'PACKING LOCAL L': '603',
  'PACKING LOCAL/PHILVEST': '603',
  'PACKING LOCAL LINE-C': 'MK-DS',
  'PACKING LINE 1 TUNA 3': 'FO-NS',
  'PACKING LOCAL T-3': 'FO-NS',
  'PACKING LOCAL TUNE 3 L6': '603',
  'PK LOCAL TUNE 3 L6': '603',
  'PK L3 TUNA 3': '603',
  'TUNA 3': '603',
  'LINE 6 ALPHA PACKING': '603',
  '603 PACKING COM': '603',
  'BIGDOME MACKEREL PACKING': '603',
  'BIGDOME MACKEREL RECEIVING/CUTTING SECTION': '603',
  'BIGDOME PETFOOD': '603',
  'BIGDOME': '603',
  'MP': '603',
  'VEGIE PREP': '603',
  'TUNA 3 VEG PREP': '603',
  'AWI WHSE': '603',
  'RECEIVING': '603',
  'FINANCE': '307',
  'DEFECTIVES': '603',
  'EXPORT SKINNING / LOINING': '603',
  'PROJECT TELESCOPE': '603',
};

function getShiftFromArea(area) {
  if (!area) return '603';
  const upperArea = area.toUpperCase();
  
  if (shiftMap[upperArea]) return shiftMap[upperArea];
  
  const match = upperArea.match(/\b(\d{3})\b/);
  if (match) return match[1];
  
  return '603';
}

async function main() {
  console.log('Counting records with SHIFT 1...');

  const count = await prisma.internalRequest.count({
    where: {
      supervisor: 'LEGACY IMPORT',
      shift: 'SHIFT 1',
    },
  });

  console.log(`Found ${count} records to update`);

  if (count === 0) {
    console.log('Nothing to update');
    return;
  }

  console.log('Updating using raw SQL with CASE statements...');

  const cases = Object.entries(shiftMap)
    .map(([area, shift]) => `WHEN lower("departmentArea") = lower('${area.replace(/'/g, "''")}') THEN '${shift}'`)
    .join(' ');

  const sql = `
    UPDATE "InternalRequest"
    SET shift = CASE
      ${cases}
      WHEN lower("departmentArea") ~ '\\b603\\b' THEN '603'
      WHEN lower("departmentArea") ~ '\\b307\\b' THEN '307'
      ELSE '603'
    END
    WHERE "supervisor" = 'LEGACY IMPORT' AND shift = 'SHIFT 1'
  `;

  const result = await prisma.$executeRawUnsafe(sql);
  
  console.log(`Update complete! Records affected: ${result}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });