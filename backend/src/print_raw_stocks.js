const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['product_stock'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('--- PRODUCT_STOCK RAW DATA (First 20 Rows) ---');
rawData.slice(0, 20).forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
});
