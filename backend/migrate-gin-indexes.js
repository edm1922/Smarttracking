const { Client } = require('pg');

const DIRECT_URL = process.env.DIRECT_URL;

const client = new Client({ connectionString: DIRECT_URL, statement_timeout: 120000 });

const indexes = [
  ['idx_product_name_trgm',        '"Product"',           '(name gin_trgm_ops)'],
  ['idx_product_sku_trgm',         '"Product"',           '(sku gin_trgm_ops)'],
  ['idx_item_name_trgm',           '"Item"',              '(name gin_trgm_ops)'],
  ['idx_item_slug_trgm',           '"Item"',              '(slug gin_trgm_ops)'],
  ['idx_activitylog_action_trgm',  '"ActivityLog"',       '(action gin_trgm_ops)'],
  ['idx_user_username_trgm',       '"User"',              '(username gin_trgm_ops)'],
  ['idx_ir_employee_trgm',         '"InternalRequest"',   '("employeeName" gin_trgm_ops)'],
  ['idx_ir_supervisor_trgm',       '"InternalRequest"',   '(supervisor gin_trgm_ops)'],
  ['idx_ir_dept_trgm',             '"InternalRequest"',   '("departmentArea" gin_trgm_ops)'],
  ['idx_ir_reqno_trgm',            '"InternalRequest"',   '("requestNo" gin_trgm_ops)'],
  ['idx_por_remarks_trgm',         '"PullOutRequest"',    '(remarks gin_trgm_ops)'],
  ['idx_ppt_remarks_trgm',         '"ProductTransaction"', '(remarks gin_trgm_ops)'],
  ['idx_location_name_trgm',       '"Location"',          '(name gin_trgm_ops)'],
];

(async () => {
  try {
    await client.connect();
    console.log('Connected. Creating GIN trigram indexes...\n');

    for (const [name, table, cols] of indexes) {
      process.stdout.write(`  ${name} ... `);
      try {
        await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${table} USING GIN ${cols}`);
        console.log('OK');
      } catch (err) {
        console.log(`FAIL: ${err.message}`);
      }
    }

    console.log('\nDone. Verifying...');
    const result = await client.query(`
      SELECT indexrelname, tablename
      FROM pg_stat_user_indexes
      WHERE indexrelname LIKE '%trgm%'
      ORDER BY tablename, indexrelname
    `);
    result.rows.forEach(r => console.log(`  ${r.tablename} -> ${r.indexrelname}`));

  } catch (err) {
    console.error('Fatal:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
