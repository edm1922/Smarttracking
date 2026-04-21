const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\nSheet: ${name}`);
    console.log('Header Row:', data[0]);
    if (data.length > 1) {
        console.log('Sample Row:', data[1]);
    }
});
