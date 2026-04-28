import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting performance seeding...');

  // 1. Create a default location if not exists
  let location = await prisma.location.findFirst();
  if (!location) {
    location = await prisma.location.create({
      data: { name: 'Main Warehouse' },
    });
  }

  // 2. Create or Update a default user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  let user = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }

  // 3. Seed Products (1,000 items)
  console.log('📦 Seeding 1,000 products...');
  const products = [];
  for (let i = 1; i <= 1000; i++) {
    products.push({
      sku: `SKU-${i.toString().padStart(4, '0')}`,
      name: `Performance Test Product ${i}`,
      description: `Bulk seeded product for load testing ${i}`,
      unit: 'pcs',
      price: Math.floor(Math.random() * 1000),
      threshold: 10,
    });

    if (i % 200 === 0) {
      await prisma.product.createMany({ data: products });
      products.length = 0;
      console.log(`  - Created ${i} products`);
    }
  }

  // 4. Seed Transactions (5,000 items)
  console.log('📑 Seeding 5,000 transactions...');
  const allProductIds = await prisma.product.findMany({ select: { id: true } });
  const transactions = [];
  for (let i = 1; i <= 5000; i++) {
    const randomProduct = allProductIds[Math.floor(Math.random() * allProductIds.length)];
    transactions.push({
      productId: randomProduct.id,
      locationId: location.id,
      userId: user.id,
      type: Math.random() > 0.5 ? 'IN' : 'OUT',
      quantity: Math.floor(Math.random() * 50) + 1,
      remarks: `Performance test log entry ${i}`,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
    });

    if (i % 500 === 0) {
      await prisma.productTransaction.createMany({ data: transactions });
      transactions.length = 0;
      console.log(`  - Created ${i} transactions`);
    }
  }

  // 5. Seed Internal Requests (1,000 items)
  console.log('📧 Seeding 1,000 internal requests...');
  const requests = [];
  for (let i = 1; i <= 1000; i++) {
    const randomProduct = allProductIds[Math.floor(Math.random() * allProductIds.length)];
    requests.push({
      requestNo: `REQ-PERF-${i.toString().padStart(4, '0')}`,
      productId: randomProduct.id,
      locationId: location.id,
      employeeName: `Employee ${Math.floor(Math.random() * 50)}`,
      employeeRole: 'Staff',
      departmentArea: 'Production',
      shift: 'Day',
      supervisor: 'Supervisor X',
      quantity: Math.floor(Math.random() * 10) + 1,
      status: i % 3 === 0 ? 'FULFILLED' : i % 3 === 1 ? 'PENDING' : 'APPROVED',
      date: new Date(),
      remarks: `Performance test request ${i}`,
    });

    if (i % 250 === 0) {
      await prisma.internalRequest.createMany({ data: requests });
      requests.length = 0;
      console.log(`  - Created ${i} requests`);
    }
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
