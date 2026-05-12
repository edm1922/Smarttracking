import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: {
          location: true
        }
      }
    }
  });

  const productsInMultipleLocations = products.filter(p => p.stocks.length > 1);
  console.log(`Products in multiple locations: ${productsInMultipleLocations.length} / ${products.length}`);

  if (productsInMultipleLocations.length > 0) {
    productsInMultipleLocations.slice(0, 5).forEach(p => {
      console.log(`Product: ${p.name} (${p.sku})`);
      p.stocks.forEach(s => {
        console.log(`  - ${s.location.name}: ${s.quantity}`);
      });
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
