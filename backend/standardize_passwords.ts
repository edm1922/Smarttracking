import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Copy of the normalization logic from payroll.service.ts
function normalizeSysId(id: string): string {
  if (!id) return '';
  const clean = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (clean.startsWith('CSC')) {
    const numbers = clean.substring(3);
    if (numbers.length > 4) {
      return `CSC-${numbers.substring(0, 4)}-${numbers.substring(4)}`;
    } else if (numbers.length > 0) {
      return `CSC-${numbers}`;
    }
    return 'CSC';
  }
  return clean;
}

async function main() {
  console.log('Starting migration to standardize sys_id and passwords...');
  
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' }
  });

  console.log(`Found ${employees.length} employees to process.`);

  let updatedCount = 0;

  for (const employee of employees) {
    if (!employee.sys_id) continue;

    const normalizedId = normalizeSysId(employee.sys_id);
    const dashlessId = normalizedId.replace(/-/g, '');
    const hashedPassword = await bcrypt.hash(dashlessId, 10);

    await prisma.user.update({
      where: { id: employee.id },
      data: {
        sys_id: normalizedId,
        password: hashedPassword
      }
    });

    updatedCount++;
    if (updatedCount % 50 === 0) {
      console.log(`Processed ${updatedCount}/${employees.length}...`);
    }
  }

  console.log(`Successfully standardized ${updatedCount} employees.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
