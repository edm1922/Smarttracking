const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const prSheet = workbook.Sheets['purchase_requests'];
const prData = XLSX.utils.sheet_to_json(prSheet);
console.log('PR Sample Keys:', Object.keys(prData[0]));
console.log('PR Sample Row:', JSON.stringify(prData[0], null, 2));

const itemsSheet = workbook.Sheets['items'];
const itemsData = XLSX.utils.sheet_to_json(itemsSheet);
console.log('\nItems Sample Keys:', Object.keys(itemsData[0]));
console.log('Items Sample Row:', JSON.stringify(itemsData[0], null, 2));
