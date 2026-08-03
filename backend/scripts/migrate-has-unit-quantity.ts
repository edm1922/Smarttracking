import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const MARKER_SQL = `
  (
    (fv."value" ? 'useUnitQty' AND (fv."value"->>'useUnitQty') = 'true')
    OR
    (fv."value" ? 'hasUnitQuantity' AND (fv."value"->>'hasUnitQuantity') = 'true')
  )
`;

function stripCarrierKeys(value: any): any {
  const { useUnitQty, hasUnitQuantity, qty, unit, threshold, ...rest } = value;
  return Object.keys(rest).length > 0 ? rest : null;
}

async function main() {
  const mode = APPLY ? 'APPLY' : 'DRY RUN (no changes)';
  console.log(`\n[hasUnitQuantity migration] Mode: ${mode}\n`);

  // 1. Check whether the column already exists
  const colRows = (await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Item' AND column_name = 'hasUnitQuantity'`,
  )) as any[];
  const columnExists = colRows.length > 0;
  console.log(`Column "Item"."hasUnitQuantity" exists: ${columnExists}`);

  // 2. Baseline counts
  const totalItems = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "Item"`,
  )) as any[];
  const markerCount = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(DISTINCT i.id)::int AS cnt
     FROM "Item" i
     JOIN "ItemFieldValue" fv ON fv."itemId" = i.id
     WHERE ${MARKER_SQL}`,
  )) as any[];
  const alreadyTrue = columnExists
    ? ((await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS cnt FROM "Item" WHERE "hasUnitQuantity" = true`,
      )) as any[])[0].cnt
    : 0;

  console.log(`Total items:            ${totalItems[0].cnt}`);
  console.log(`Items with JSON marker: ${markerCount[0].cnt}`);
  console.log(`Items already flagged:  ${alreadyTrue}`);

  const toFlag = Math.max(0, markerCount[0].cnt - alreadyTrue);
  console.log(`Items to backfill:      ${toFlag}`);

  // 3. Detect duplicate carriers (same item has >1 unit-tracking field value)
  const carrierRows = (await prisma.$queryRawUnsafe(`
    SELECT i."id" AS item_id, i."slug", i."name", i."unit",
           fv."id" AS fv_id, fv."fieldId", fv."value",
           f."name" AS field_name, f."orderIndex"
    FROM "Item" i
    JOIN "ItemFieldValue" fv ON fv."itemId" = i.id
    LEFT JOIN "CustomField" f ON f."id" = fv."fieldId"
    WHERE i."hasUnitQuantity" = true AND ${MARKER_SQL}
    ORDER BY i."id", f."orderIndex", fv."fieldId"
  `)) as any[];

  const itemMap = new Map<string, { item: any; carriers: any[] }>();
  for (const row of carrierRows) {
    let entry = itemMap.get(row.item_id);
    if (!entry) {
      entry = {
        item: { id: row.item_id, slug: row.slug, name: row.name, unit: row.unit },
        carriers: [],
      };
      itemMap.set(row.item_id, entry);
    }
    entry.carriers.push({
      id: row.fv_id,
      fieldId: row.fieldId,
      field: { name: row.field_name, orderIndex: row.orderIndex },
      value: row.value,
    });
  }

  const multiCarrier = Array.from(itemMap.values()).filter((m) => m.carriers.length > 1);

  console.log(`\nDuplicate-carrier items: ${multiCarrier.length}`);
  console.log(`Total duplicate carrier rows to clean: ${multiCarrier.reduce((s, m) => s + m.carriers.length - 1, 0)}`);

  if (multiCarrier.length > 0) {
    console.log('\nSample of duplicate-carrier items:');
    for (const m of multiCarrier.slice(0, 10)) {
      const desc = m.carriers
        .map((c) => `${c.field?.name}: qty=${(c.value as any).qty ?? '-'}`)
        .join(' | ');
      console.log(`  ${m.item.slug} (${m.item.name}): ${desc}`);
    }
  }

  if (!APPLY) {
    console.log('\n[Dry run] Planned SQL / actions:');
    if (!columnExists) {
      console.log('  1. ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "hasUnitQuantity" BOOLEAN NOT NULL DEFAULT false;');
    }
    console.log(`  2. UPDATE "Item" i SET "hasUnitQuantity" = true WHERE EXISTS (SELECT 1 FROM "ItemFieldValue" fv WHERE fv."itemId" = i.id AND ${MARKER_SQL});`);
    console.log(`  3. UPDATE "Item" i SET "unit" = fv."value"->>'unit' FROM "ItemFieldValue" fv WHERE fv."itemId" = i.id AND <marker> AND (fv."value"->>'unit') <> '' AND (i."unit" IS NULL OR i."unit" = '' OR i."unit" = 'pcs');`);
    console.log(`  4. Normalize duplicate carriers: keep highest-qty carrier per item (tie-break: field orderIndex), strip carrier keys from the rest (${multiCarrier.length} item(s)).`);
    console.log('\nRe-run with --apply to execute.');
    return;
  }

  // ---- APPLY ----
  if (!columnExists) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "hasUnitQuantity" BOOLEAN NOT NULL DEFAULT false;`,
    );
    console.log('\n1. Column added.');
  } else {
    console.log('\n1. Column already present, skipping ALTER.');
  }

  const backfill = await prisma.$executeRawUnsafe(
    `UPDATE "Item" i
     SET "hasUnitQuantity" = true
     WHERE EXISTS (
       SELECT 1 FROM "ItemFieldValue" fv
       WHERE fv."itemId" = i.id AND ${MARKER_SQL}
     )`,
  );
  console.log(`2. Backfilled hasUnitQuantity on ${backfill} item(s).`);

  const unitBackfill = await prisma.$executeRawUnsafe(
    `UPDATE "Item" i
     SET "unit" = fv."value"->>'unit'
     FROM "ItemFieldValue" fv
     WHERE fv."itemId" = i.id
       AND ${MARKER_SQL}
       AND (fv."value"->>'unit') IS NOT NULL
       AND (fv."value"->>'unit') <> ''
       AND (i."unit" IS NULL OR i."unit" = '' OR i."unit" = 'pcs')`,
  );
  console.log(`3. Backfilled unit column on ${unitBackfill} item(s).`);

  // 4. Normalize duplicate carriers
  let normalizedItems = 0;
  let strippedRows = 0;
  for (const { item, carriers } of multiCarrier) {
    // Keeper: highest numeric qty, tie-break by field orderIndex then fieldId
    const keeper = [...carriers].sort((a, b) => {
      const qtyDiff = Number((b.value as any).qty) - Number((a.value as any).qty);
      if (qtyDiff !== 0) return qtyDiff;
      const orderDiff = (a.field?.orderIndex ?? 0) - (b.field?.orderIndex ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.fieldId || '').localeCompare(b.fieldId || '');
    })[0];

    let updated = false;
    for (const c of carriers) {
      if (c.id === keeper.id) continue;
      const cleaned = stripCarrierKeys(c.value as any);
      await prisma.itemFieldValue.update({
        where: { id: c.id },
        data: { value: cleaned },
      });
      strippedRows++;
      updated = true;
    }
    if (updated) normalizedItems++;

    // Re-sync the unit column from the keeper carrier
    if (keeper && (keeper.value as any).unit && (item.unit === null || item.unit === '' || item.unit === 'pcs')) {
      await prisma.item.update({
        where: { id: item.id },
        data: { unit: (keeper.value as any).unit },
      });
    }
  }
  console.log(`4. Normalized ${normalizedItems} item(s), stripped ${strippedRows} duplicate carrier row(s).`);

  // Verify
  const afterTrue = ((await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM "Item" WHERE "hasUnitQuantity" = true`,
  )) as any[])[0].cnt;
  const orphanMarkers = ((await prisma.$queryRawUnsafe(
    `SELECT COUNT(DISTINCT i.id)::int AS cnt
     FROM "Item" i
     JOIN "ItemFieldValue" fv ON fv."itemId" = i.id
     WHERE ${MARKER_SQL} AND i."hasUnitQuantity" = false`,
  )) as any[])[0].cnt;
  const stillMulti = ((await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt
     FROM (
       SELECT i."id"
       FROM "Item" i
       JOIN "ItemFieldValue" fv ON fv."itemId" = i.id
       WHERE i."hasUnitQuantity" = true AND ${MARKER_SQL}
       GROUP BY i."id"
       HAVING COUNT(*) > 1
     ) x`,
  )) as any[])[0].cnt;
  const unitStillEmpty = ((await prisma.$queryRawUnsafe(
    `SELECT COUNT(DISTINCT i.id)::int AS cnt
     FROM "Item" i
     JOIN "ItemFieldValue" fv ON fv."itemId" = i.id
     WHERE ${MARKER_SQL} AND (i."unit" IS NULL OR i."unit" = '' OR i."unit" = 'pcs')
       AND (fv."value"->>'unit') IS NOT NULL AND (fv."value"->>'unit') <> ''`,
  )) as any[])[0].cnt;

  console.log(`\nVerification:`);
  console.log(`  hasUnitQuantity = true count: ${afterTrue}`);
  console.log(`  items with marker but flag false (orphans): ${orphanMarkers}`);
  console.log(`  items still with multiple carriers: ${stillMulti}`);
  console.log(`  items with carrier unit still not applied: ${unitStillEmpty}`);

  console.log('\nMigration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
