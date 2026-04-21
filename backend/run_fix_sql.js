const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
    const sql = fs.readFileSync('fix_logs.sql', 'utf8');
    const commands = sql.split(';\n').filter(cmd => cmd.trim() !== '');
    
    console.log(`Executing ${commands.length} updates...`);
    let count = 0;
    
    for (const cmd of commands) {
        try {
            await prisma.$executeRawUnsafe(cmd);
            count++;
            if (count % 10 === 0) console.log(`Progress: ${count}/${commands.length}`);
            // Add small delay to avoid connection spikes
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            console.error(`Failed at command: ${cmd}\nError: ${err.message}`);
        }
    }
    
    console.log(`Finished. Updated ${count} patterns.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
