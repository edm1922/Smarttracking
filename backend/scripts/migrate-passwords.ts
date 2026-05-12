import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting password and ID migration...');
  
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE',
      OR: [
        { sys_id: { contains: '-' } },
        // Even if sys_id is cleaned, we might want to reset passwords to the clean version
      ]
    }
  });

  console.log(`Found ${employees.length} employees to migrate.`);

  for (const employee of employees) {
    if (!employee.sys_id) continue;

    const cleanId = employee.sys_id.replace(/-/g, '').toUpperCase();
    const hashedPassword = await bcrypt.hash(cleanId, 10);

    await prisma.user.update({
      where: { id: employee.id },
      data: {
        sys_id: cleanId,
        password: hashedPassword
      }
    });

    console.log(`Migrated: ${employee.sys_id} -> ${cleanId}`);
  }

  console.log('Migration completed successfully.');
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
