const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const data = XLSX.utils.sheet_to_json(sheet);

const marker = data.find(i => (i.name || '').toLowerCase().includes('marker'));
console.log('Marker item:', JSON.stringify(marker, null, 2));
