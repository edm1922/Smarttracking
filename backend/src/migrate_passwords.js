const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting password migration...');
  
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' }
  });

  console.log(`Found ${employees.length} employees.`);
  
  let migratedCount = 0;
  for (const employee of employees) {
    // Check if it's already hashed (bcrypt hashes start with $2b$ or $2a$)
    if (employee.password.startsWith('$2b$') || employee.password.startsWith('$2a$')) {
      continue;
    }

    const hashedPassword = await bcrypt.hash(employee.password.trim(), 10);
    await prisma.user.update({
      where: { id: employee.id },
      data: { password: hashedPassword }
    });
    migratedCount++;
    if (migratedCount % 10 === 0) console.log(`Migrated ${migratedCount} users...`);
  }

  console.log(`Migration complete! ${migratedCount} passwords hashed.`);
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
