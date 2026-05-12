import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Restoring dashes to IDs...');
  
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE'
    }
  });

  console.log(`Found ${employees.length} employees to check.`);

  for (const employee of employees) {
    if (!employee.sys_id) continue;

    // If ID is CSC20262200, it should be CSC-2026-2200
    if (!employee.sys_id.includes('-') && employee.sys_id.startsWith('CSC')) {
      const dashedId = `CSC-${employee.sys_id.substring(3, 7)}-${employee.sys_id.substring(7)}`;
      const cleanIdForPassword = employee.sys_id; // already dash-less
      const hashedPassword = await bcrypt.hash(cleanIdForPassword, 10);

      await prisma.user.update({
        where: { id: employee.id },
        data: {
          sys_id: dashedId,
          password: hashedPassword
        }
      });

      console.log(`Restored: ${employee.sys_id} -> ${dashedId}`);
    } else {
        // Even if it has dashes, ensure password is dash-less
        const cleanIdForPassword = employee.sys_id.replace(/-/g, '');
        const hashedPassword = await bcrypt.hash(cleanIdForPassword, 10);
        await prisma.user.update({
            where: { id: employee.id },
            data: {
              password: hashedPassword
            }
        });
        console.log(`Ensured dash-less password for: ${employee.sys_id}`);
    }
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
