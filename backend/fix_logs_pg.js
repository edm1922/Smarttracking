const { Client } = require('pg');
const fs = require('fs');

const connectionString = "postgresql://postgres.dtpjhomraxyezpvwfymv:Tripz0219!!!@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";

async function run() {
    const client = new Client({ connectionString });
    await client.connect();
    console.log('Connected to DB');

    const sql = fs.readFileSync('fix_logs.sql', 'utf8');
    const commands = sql.split(';\n').filter(cmd => cmd.trim() !== '');
    
    console.log(`Executing ${commands.length} updates...`);
    let count = 0;
    
    for (const cmd of commands) {
        try {
            await client.query(cmd);
            count++;
            if (count % 10 === 0) console.log(`Progress: ${count}/${commands.length}`);
        } catch (err) {
            console.error(`Error: ${err.message}`);
        }
    }
    
    await client.end();
    console.log(`Finished. Updated ${count} patterns.`);
}

run().catch(console.error);
