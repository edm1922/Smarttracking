const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../ISSUANCE_LOG_EXPORT.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total Rows:', data.length);
console.log('Sample Row:', JSON.stringify(data[0], null, 2));
