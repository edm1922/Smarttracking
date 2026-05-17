const XLSX = require('xlsx');
const path = require('path');

function main() {
  const filePath = path.resolve(__dirname, '2026_Fabric & Tailor Request Records (1).xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Transaction'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log("=== HEADER ROW (i = 0) ===");
  console.log(rawData[0]);

  console.log("\n=== HEADER ROW (i = 1) ===");
  console.log(rawData[1]);

  console.log("\n=== HEADER ROW (i = 2) ===");
  console.log(rawData[2]);

  console.log("\n=== SAMPLE ROW 5 (i = 5) ===");
  console.log(rawData[5]);

  console.log("\n=== SAMPLE ROW 10 (i = 10) ===");
  console.log(rawData[10]);

  console.log("\n=== LATEST ROW ===");
  console.log(rawData[rawData.length - 1]);
}

main();
