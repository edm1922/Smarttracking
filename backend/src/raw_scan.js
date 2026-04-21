const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total raw rows:', rawData.length);

const headers = rawData[0];
const stockColIndex = headers.indexOf('actual_stock');
console.log('actual_stock is at index:', stockColIndex);

if (stockColIndex !== -1) {
    let rowsWithStock = 0;
    for (let i = 1; i < rawData.length; i++) {
        const val = parseFloat(rawData[i][stockColIndex]);
        if (!isNaN(val) && val > 0) {
            rowsWithStock++;
            if (rowsWithStock <= 5) {
                console.log(`Row ${i}: ${rawData[i][1]} - Stock: ${val}`);
            }
        }
    }
    console.log('Total rows with stock > 0:', rowsWithStock);
}

// Also check product_stock sheet with header: 1
const psSheet = workbook.Sheets['product_stock'];
const psData = XLSX.utils.sheet_to_json(psSheet, { header: 1 });
console.log('\n--- product_stock (raw) ---');
console.log('Total raw rows:', psData.length);
if (psData.length > 1) {
    console.log('Headers:', psData[0]);
    console.log('Sample Data Row:', psData[1]);
}
