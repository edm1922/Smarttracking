const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['stocks'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('--- STOCKS SHEET (First 5 Rows) ---');
data.slice(0, 5).forEach(row => console.log(JSON.stringify(row)));
