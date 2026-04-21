const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const range = XLSX.utils.decode_range(sheet['!ref']);

console.log('Sheet Range:', sheet['!ref']);

for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellRef];
        if (cell && cell.v !== undefined && typeof cell.v === 'number' && cell.v > 0) {
            // If it's in the actual_stock column (index 6)
            if (C === 6) {
                console.log(`Cell ${cellRef} (Stock Col) has value: ${cell.v} for row ${R}`);
            }
        }
    }
}
