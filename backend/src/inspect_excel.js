const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`\n--- ${sheetName} ---`);
  console.log('Total Rows:', data.length);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample Row:', JSON.stringify(data[0], null, 2));
  }
});
