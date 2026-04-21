const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const items = XLSX.utils.sheet_to_json(workbook.Sheets['items']);
const withStock = items.filter(i => i.actual_stock > 0);
console.log('Items with stock > 0:', withStock.length);
if (withStock.length > 0) {
  console.log('Sample item with stock:', JSON.stringify(withStock[0], null, 2));
}

const stockSheet = XLSX.utils.sheet_to_json(workbook.Sheets['product_stock']);
console.log('Product Stock Rows:', stockSheet.length);
