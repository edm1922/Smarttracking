const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Header Row:', rawData[0]);
console.log('First Data Row:', rawData[1]);
