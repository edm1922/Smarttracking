const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true
    }
  });

  console.log('--- ALL SYSTEM USERS ---');
  users.forEach(u => {
    console.log(`[${u.role}] ${u.username} (ID: ${u.id}) - Created: ${u.createdAt}`);
  });

  const payrollAdmins = users.filter(u => u.role === 'payroll_admin');
  console.log('\nPayroll Admins:', payrollAdmins.length);
}

check().catch(console.error).finally(() => prisma.$disconnect());
