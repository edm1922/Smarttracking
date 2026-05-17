const XLSX = require('xlsx');
const path = require('path');

function main() {
  const filePath = path.resolve(__dirname, '2026_Fabric & Tailor Request Records (1).xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Transaction'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const map = new Map();
  const duplicates = [];

  for (let i = 3; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0] || !row[3] || !row[5]) continue;

    const rawTransactionNo = row[0];
    const rawSeriesNo = row[1];
    const key = `${rawTransactionNo}_${rawSeriesNo}_${i + 1}`;

    if (map.has(key)) {
      duplicates.push({ rowIdx: i + 1, key, val: row });
    } else {
      map.set(key, i + 1);
    }
  }

  console.log(`Found ${duplicates.length} exact key duplicates:`);
  console.log(duplicates);
}

main();
