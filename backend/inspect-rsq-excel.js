const XLSX = require('xlsx');
const path = require('path');

async function main() {
  const filePath = path.resolve(__dirname, '2026_Fabric & Tailor Request Records (1).xlsx');
  console.log("Reading file:", filePath);
  const workbook = XLSX.readFile(filePath);
  console.log("Sheet names:", workbook.SheetNames);

  // Let's inspect the first sheet (usually 'transaction' or similar)
  const firstSheetName = workbook.SheetNames[0];
  console.log("First sheet name:", firstSheetName);

  const sheet = workbook.Sheets[firstSheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log("=== FIRST 15 ROWS ===");
  console.log(rawData.slice(0, 15));
}

main().catch(console.error);
