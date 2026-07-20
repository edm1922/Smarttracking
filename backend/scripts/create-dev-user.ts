import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin'; // If 'admin' exists, we can update it or create another one
  const pass = 'admin123';
  const hashedPassword = await bcrypt.hash(pass, 10);

  // Check if 'admin' user exists
  const existingUser = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (existingUser) {
    console.log(`User 'admin' already exists. Updating password to '${pass}'...`);
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        role: 'admin'
      }
    });
    console.log('Successfully updated:', updated.username);
  } else {
    console.log(`Creating user 'admin' with password '${pass}'...`);
    const created = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        fullName: 'Dev Admin',
        sys_id: 'DEV-ADMIN-001'
      }
    });
    console.log('Successfully created:', created.username);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
