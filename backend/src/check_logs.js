const XLSX = require('xlsx');

const filePath = 'c:\\Users\\EDRON\\Desktop\\Dev Apps\\QR tracker\\supply_system_export.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['inventory_action_logs'];
const data = XLSX.utils.sheet_to_json(sheet);

const stockLogs = data.filter(l => (l.details || '').toLowerCase().includes('stock') || (l.action_type || '').toLowerCase().includes('stock'));
console.log('Stock-related logs:', stockLogs.length);
console.log('Sample stock log:', stockLogs.slice(-5));
