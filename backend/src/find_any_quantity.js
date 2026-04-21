const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    console.log(`\nSheet: ${name} (${data.length} rows)`);
    
    headers.forEach(header => {
        const withStock = data.filter(row => {
            const val = parseFloat(row[header]);
            return !isNaN(val) && val > 0 && !header.toLowerCase().includes('id') && !header.toLowerCase().includes('date');
        });
        if (withStock.length > 0) {
            console.log(`  - Column "${header}": ${withStock.length} rows have value > 0`);
            console.log(`    Sample: ${withStock[0][header]} for item ${withStock[0].name || withStock[0].item_name || '?'}`);
        }
    });
});
