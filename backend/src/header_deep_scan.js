const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const headers = rawData[0];

console.log('Headers (detailed):');
headers.forEach((h, i) => {
    console.log(`Index ${i}: "${h}" (Length: ${h.length})`);
});

// Check if any other index has stock values
for (let j = 0; j < headers.length; j++) {
    const withVal = rawData.slice(1).filter(row => parseFloat(row[j]) > 0);
    console.log(`Column ${j} ("${headers[j]}"): ${withVal.length} items with value > 0`);
}
