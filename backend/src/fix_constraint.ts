import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Attempting to update profiles_role_check constraint...");
  try {
    // 1. Drop existing constraint
    await prisma.$executeRawUnsafe(`ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;`);
    
    // 2. Add new constraint with 'staff' included
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('admin', 'inventory', 'super_admin', 'payroll_admin', 'staff'));
    `);
    
    console.log("Database constraint updated successfully! 'staff' role is now allowed.");
  } catch (error: any) {
    console.error("Failed to update constraint:", error.message);
    console.log("Please run the following SQL manually in your Supabase SQL Editor:");
    console.log("ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;");
    console.log("ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'inventory', 'super_admin', 'payroll_admin', 'staff'));");
  } finally {
    await prisma.$disconnect();
  }
}

main();
