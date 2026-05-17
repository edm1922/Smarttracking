const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== FABRIC TRANSACTIONS (20 rows) ===");
  const transactions = await prisma.fabricTransaction.findMany({
    take: 20,
    orderBy: { date: 'desc' },
    include: {
      fabric: true,
    }
  });
  console.log(JSON.stringify(transactions.map(t => ({
    id: t.id,
    transactionNo: t.transactionNo,
    type: t.type,
    quantity: t.quantity,
    remarks: t.remarks,
    date: t.date,
    fabricName: t.fabric?.name
  })), null, 2));

  console.log("\n=== TAILORING REQUESTS (10 rows) ===");
  const requests = await prisma.tailoringRequest.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      fabric: true,
      tailor: true
    }
  });
  console.log(JSON.stringify(requests.map(r => ({
    id: r.id,
    rsqNo: r.rsqNo,
    quantityOrdered: r.quantityOrdered,
    quantityReceived: r.quantityReceived,
    fabricName: r.fabric?.name,
    tailorName: r.tailor?.name,
    remarks: r.remarks
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
