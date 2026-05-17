const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== TAILORING REQUESTS DETAILS ===");
  const requests = await prisma.tailoringRequest.findMany({
    orderBy: { rsqNo: 'desc' },
    take: 50,
    include: {
      fabric: true,
      tailor: true,
      product: true
    }
  });
  console.log(JSON.stringify(requests.map(r => ({
    rsqNo: r.rsqNo,
    fabricName: r.fabric?.name,
    fabricType: r.fabric?.type,
    quantityOrdered: r.quantityOrdered,
    orderDate: r.orderDate,
    status: r.status,
    remarks: r.remarks,
    productName: r.product?.name,
    tailorName: r.tailor?.name
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
