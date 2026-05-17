const XLSX = require('xlsx');
const path = require('path');

async function main() {
  const filePath = path.resolve(__dirname, '2026_Fabric & Tailor Request Records (1).xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Transaction'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Rows 0 to 2 are header rows, actual transactions start from index 3
  const transactions = [];
  for (let i = 3; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && row[0]) { // Transaction # is present
      transactions.push({
        rowNum: i + 1,
        transactionNo: row[0],
        seriesNo: row[1],
        rsqNo: row[2],
        apparel: row[3],
        group: row[4],
        type: row[5],
        month: row[6],
        excelDate: row[7],
        qty: row[8],
        unit: row[9],
        price: row[10],
        amount: row[11],
        destination: row[14], // Stocks From / Destination
        remarks: row[21] // Remarks is Column2 (index 21)
      });
    }
  }

  console.log("Total transaction rows in Excel:", transactions.length);
  console.log("Unique Types:", Array.from(new Set(transactions.map(t => t.type))));
  
  console.log("\n=== LAST 15 TRANSACTIONS IN EXCEL ===");
  console.log(JSON.stringify(transactions.slice(-15), null, 2));
}

main().catch(console.error);
