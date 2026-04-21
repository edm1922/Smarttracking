const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Total items:', data.length);
console.log('Columns found:', Object.keys(data[0]));

const stockValues = data.map(i => ({ 
  name: i.name, 
  actual: i.actual_stock, 
  type: typeof i.actual_stock 
})).slice(0, 50);

console.log('Sample Stock Values:');
console.log(stockValues);

const anyStock = data.find(i => i.actual_stock > 0 || parseFloat(i.actual_stock) > 0);
console.log('Any item with stock > 0?', anyStock ? 'YES' : 'NO');
if (anyStock) {
    console.log('Found item with stock:', anyStock.name, anyStock.actual_stock);
}
