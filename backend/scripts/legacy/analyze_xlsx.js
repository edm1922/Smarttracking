const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length > 0) {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        console.log('Columns:', data[0]);
        console.log('First Row Sample:', data[1]);
    }
});
