const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['quick_pull_logs'];
const data = XLSX.utils.sheet_to_json(sheet);

const target = data.find(row => row.purpose === 'CENTRO EXPRESS' && row.destination === 'BAKERY');

if (target) {
    console.log('Found Record:', target);
} else {
    console.log('Record not found with purpose=CENTRO EXPRESS and destination=BAKERY');
    // Try searching just by purpose
    const byPurpose = data.filter(row => row.purpose === 'CENTRO EXPRESS');
    console.log(`Found ${byPurpose.length} records with purpose=CENTRO EXPRESS`);
    if (byPurpose.length > 0) console.log('First match:', byPurpose[0]);
}
