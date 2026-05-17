const XLSX = require('xlsx');
const path = require('path');

async function main() {
  const filePath = path.resolve(__dirname, '2026_Fabric & Tailor Request Records (1).xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Transaction'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log("=== ROW 51 ===");
  console.log(rawData[50]);
  console.log("=== ROW 52 ===");
  console.log(rawData[51]);
  console.log("=== ROW 53 ===");
  console.log(rawData[52]);
}

main().catch(console.error);
