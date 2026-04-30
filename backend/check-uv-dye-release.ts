import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get all locations
  const locations = await prisma.location.findMany({
    select: { id: true, name: true }
  });
  console.log('Locations:', locations.map(l => `${l.name} (${l.id})`).join(', '));
  
  // Check UV DYE INK product and stock at each location
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'UV DYE', mode: 'insensitive' } },
    include: { stocks: { include: { location: true } } }
  });
  
  if (!product) {
    console.log('Product not found');
    return;
  }
  
  console.log(`\nProduct: ${product.name} (${product.sku})`);
  console.log('Stock by location:');
  if (product.stocks.length === 0) {
    console.log('  No stock records');
  } else {
    product.stocks.forEach(s => {
      console.log(`  - ${s.location.name}: ${s.quantity}`);
    });
  }
  
  // Check if product appears in /products API with take=1000
  const allProducts = await prisma.product.findMany({
    take: 1000,
    select: { id: true, name: true, sku: true }
  });
  
  console.log(`\nTotal products fetched with take=1000: ${allProducts.length}`);
  const found = allProducts.find(p => p.name.toLowerCase().includes('uv dye'));
  console.log('UV DYE INK in list:', found ? 'YES' : 'NO');
}

main().catch(console.error).finally(() => prisma.$disconnect());
