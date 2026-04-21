const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    console.log(`Sheet: ${name}, Range: ${sheet['!ref']}`);
});
