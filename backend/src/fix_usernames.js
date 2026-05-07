const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const users = await prisma.user.findMany();
  let count = 0;
  for (const user of users) {
    const trimmed = user.username.trim().toLowerCase();
    if (trimmed !== user.username) {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: trimmed }
      });
      console.log(`Fixed: "${user.username}" -> "${trimmed}"`);
      count++;
    }
  }
  console.log(`Total users fixed: ${count}`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
