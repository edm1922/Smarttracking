const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== UNIQUE TRANSACTION NO PATTERNS ===");
  const transactions = await prisma.fabricTransaction.findMany({
    select: { transactionNo: true, type: true }
  });
  
  const types = new Set(transactions.map(t => t.type));
  console.log("Unique Types:", Array.from(types));

  const samples = transactions.slice(0, 100).map(t => t.transactionNo);
  console.log("First 20 TransactionNo values:", samples.slice(0, 20));

  const withUnderscore = transactions.filter(t => t.transactionNo.includes('_'));
  console.log("Number of transactions with underscore:", withUnderscore.length);
  if (withUnderscore.length > 0) {
    console.log("Sample transactions with underscore:", withUnderscore.slice(0, 10));
  }

  // Also query count of transactions
  console.log("Total transaction count:", transactions.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
