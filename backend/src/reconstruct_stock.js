const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['inventory_action_logs'];
const data = XLSX.utils.sheet_to_json(sheet);

const stockMap = new Map(); // itemName -> latestStock

// Logs are usually in chronological order. We want the LATEST one.
// So we iterate through the data.
data.forEach(log => {
    const details = log.details || '';
    const match = details.match(/Remaining Stock:\s*([\d.]+)/);
    if (match) {
        const stock = parseFloat(match[1]);
        stockMap.set(log.item_name, stock);
    }
});

console.log('Reconstructed Stock for items:', stockMap.size);
const sorted = Array.from(stockMap.entries()).sort((a, b) => b[1] - a[1]);
console.log('Top items by reconstructed stock:');
console.log(sorted.slice(0, 20));

const markerStock = stockMap.get('MARKER');
console.log('MARKER Reconstructed Stock:', markerStock);
