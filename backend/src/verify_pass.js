const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function check() {
  const username = 'shinpayroll_admin';
  const plainPassword = 'PAY-MY3290';

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } }
  });

  if (!user) {
    console.log('User not found (even with insensitive check).');
    return;
  }

  console.log('User found:', user.username);
  console.log('Stored Hash:', user.password);
  
  const isMatch = await bcrypt.compare(plainPassword, user.password);
  console.log('Bcrypt Match:', isMatch);
}

check().catch(console.error).finally(() => prisma.$disconnect());
