import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const originalContent = fs.readFileSync(schemaPath, 'utf8');

try {
  console.log('🔄 Preparing prisma schema for development push...');
  let tempContent = originalContent;
  
  // 1. Change schemas array to only include "public"
  tempContent = tempContent.replace('schemas   = ["auth", "public"]', 'schemas   = ["public"]');

  // 2. Remove all models/enums that belong to "auth" schema or are "profiles"
  const blocks = tempContent.split(/(?=^(?:model|enum|generator|datasource)\b)/gm);
  const filteredBlocks = blocks.filter(block => {
    if (block.trim().startsWith('model profiles')) {
      return false;
    }
    if (block.includes('@@schema("auth")')) {
      return false;
    }
    return true;
  });

  tempContent = filteredBlocks.join('');

  // Write temporary schema
  fs.writeFileSync(schemaPath, tempContent, 'utf8');
  console.log('✅ Temporary schema written (auth schema models removed).');

  // 3. Run Prisma db push
  console.log('🚀 Pushing schema to new dev database...');
  execSync('npx prisma db push', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Database schema pushed successfully!');

  // 4. Run user seeds
  console.log('🌱 Creating staff user...');
  execSync('npx ts-node scripts/create-staff-user.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('🌱 Creating dev user...');
  execSync('npx ts-node scripts/create-dev-user.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

} catch (error: any) {
  console.error('❌ Error during setup:', error);
} finally {
  // 5. Always restore the original schema file
  fs.writeFileSync(schemaPath, originalContent, 'utf8');
  console.log('🔄 Restored original prisma schema file.');
}
