const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);
const excelLogs = XLSX.utils.sheet_to_json(workbook.Sheets['quick_pull_logs']);

let sql = '';
const processedPatterns = new Set();

excelLogs.forEach(row => {
    if (row.purpose && row.destination && row.requested_by) {
        const purpose = row.purpose.toString().trim();
        const destination = row.destination.toString().trim();
        const requestedBy = row.requested_by.toString().trim();
        
        const oldRemarks = `Legacy Quick Pull: ${purpose} (Dest: ${destination})`;
        const newRemarks = `Legacy Quick Pull: ${purpose} | Dest: ${destination} | Req by: ${requestedBy}`;
        
        if (!processedPatterns.has(oldRemarks)) {
            // Using escaped single quotes for SQL
            const escapedOld = oldRemarks.replace(/'/g, "''");
            const escapedNew = newRemarks.replace(/'/g, "''");
            sql += `UPDATE "ProductTransaction" SET remarks = '${escapedNew}' WHERE remarks = '${escapedOld}';\n`;
            processedPatterns.add(oldRemarks);
        }
    }
});

fs.writeFileSync('fix_logs.sql', sql);
console.log(`Generated SQL script with ${processedPatterns.size} unique update patterns.`);
