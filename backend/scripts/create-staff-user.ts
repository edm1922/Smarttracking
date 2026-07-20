import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'staff';
  const pass = 'staff123';
  const hashedPassword = await bcrypt.hash(pass, 10);

  // Check if 'staff' user exists
  const existingUser = await prisma.user.findUnique({
    where: { username: username }
  });

  if (existingUser) {
    console.log(`User '${username}' already exists. Updating password to '${pass}'...`);
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        role: 'inventory'
      }
    });
    console.log('Successfully updated:', updated.username);
  } else {
    console.log(`Creating user '${username}' with password '${pass}'...`);
    const created = await prisma.user.create({
      data: {
        username: username,
        password: hashedPassword,
        role: 'inventory',
        fullName: 'Dev Staff',
        sys_id: 'DEV-STAFF-001'
      }
    });
    console.log('Successfully created:', created.username);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
