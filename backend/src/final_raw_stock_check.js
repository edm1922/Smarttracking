const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total items found:', data.length - 1);

let withStock = 0;
for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const stock = parseFloat(row[6]); // actual_stock is index 6
    if (!isNaN(stock) && stock > 0) {
        withStock++;
        if (withStock <= 10) {
            console.log(`Row ${i}: ${row[1]} - Stock: ${stock}`);
        }
    }
}

console.log('Total items with stock > 0:', withStock);
