const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to enable Cascading Deletes for User relations...');
  
  try {
    // Find all foreign keys referencing the public.User table
    const fks = await prisma.$queryRawUnsafe(`
      SELECT 
        tc.table_schema, 
        tc.table_name, 
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'User'
        AND ccu.table_schema = 'public';
    `);

    console.log(`Found ${fks.length} relations to update.`);

    for (const fk of fks) {
      const { table_schema, table_name, constraint_name, column_name, foreign_table_name, foreign_column_name } = fk;
      
      console.log(`Updating ${table_name}.${column_name} (Constraint: ${constraint_name})...`);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${table_schema}"."${table_name}" 
        DROP CONSTRAINT "${constraint_name}";
      `);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${table_schema}"."${table_name}" 
        ADD CONSTRAINT "${constraint_name}" 
        FOREIGN KEY ("${column_name}") 
        REFERENCES "${table_schema}"."${foreign_table_name}"("${foreign_column_name}") 
        ON DELETE CASCADE;
      `);
      
      console.log(`Successfully updated ${constraint_name} to ON DELETE CASCADE.`);
    }

    console.log('\nAll User relations have been updated to support cascading deletes.');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
