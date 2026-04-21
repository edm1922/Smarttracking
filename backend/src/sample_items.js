const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const items = XLSX.utils.sheet_to_json(workbook.Sheets['items']);
console.log('Sample Items:');
console.log(items.slice(0, 20).map(i => ({ sku: i.sku, name: i.name })));
