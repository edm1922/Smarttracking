const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../../supply_system_export.xlsx');
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['items'];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Total items found:', data.length);
const itemsWithStock = data.filter(i => {
    const stock = parseFloat(i.actual_stock);
    return !isNaN(stock) && stock > 0;
});

console.log('Items with actual_stock > 0:', itemsWithStock.length);
if (itemsWithStock.length > 0) {
    console.log('Sample item with stock:');
    console.log(JSON.stringify(itemsWithStock[0], null, 2));
} else {
    // Check if the column name is different (maybe case sensitive or spaces)
    const firstRow = data[0];
    console.log('Columns in first row:', Object.keys(firstRow));
    
    // Search for ANY column that might be stock
    const potentialStockCols = Object.keys(firstRow).filter(k => k.toLowerCase().includes('stock'));
    console.log('Potential stock columns:', potentialStockCols);
    
    potentialStockCols.forEach(col => {
        const withVal = data.filter(i => parseFloat(i[col]) > 0);
        console.log(`Column "${col}" has ${withVal.length} items with value > 0`);
    });
}
