const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const items = XLSX.utils.sheet_to_json(workbook.Sheets['items']);
console.log('Total items in sheet:', items.length);

const inventoryItems = items.filter(i => {
  const name = (i.name || '').toLowerCase();
  return !name.includes('qr form') && !name.includes('qr-form');
});
console.log('Inventory items found:', inventoryItems.length);

const qrItems = items.filter(i => {
  const name = (i.name || '').toLowerCase();
  return name.includes('qr form') || name.includes('qr-form');
});
console.log('QR Form items skipped:', qrItems.length);

const withActualStock = items.filter(i => i.actual_stock > 0);
console.log('Items with actual_stock > 0:', withActualStock.length);
if (withActualStock.length > 0) {
    console.log('Top items with stock:', withActualStock.slice(0, 5).map(i => `${i.name}: ${i.actual_stock}`));
}
