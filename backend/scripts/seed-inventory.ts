import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting inventory seeding...');

  // 1. Create Locations
  const locationNames = [
    'MAIN WAREHOUSE',
    'BODEGA',
    'PRODUCTION FLOOR',
    'QC STAGING',
    'STAFF DISPATCH',
  ];
  const locations: Record<string, any> = {};
  for (const name of locationNames) {
    locations[name] = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} Storage Area` },
    });
    console.log(`Location: ${name} is ready.`);
  }

  // 2. Create Products
  const productsData = [
    // ── POLO SHIRTS ──
    {
      sku: 'SKU-POLO-BLU-S',
      name: 'Blue Polo Shirt (S)',
      description: 'Standard issue staff uniform blue polo, size Small',
      unit: 'PCS',
      price: 250,
      threshold: 10,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 80 },
        { location: 'BODEGA', qty: 15 },
      ],
    },
    {
      sku: 'SKU-POLO-BLU-M',
      name: 'Blue Polo Shirt (M)',
      description: 'Standard issue staff uniform blue polo, size Medium',
      unit: 'PCS',
      price: 250,
      threshold: 10,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 100 },
        { location: 'BODEGA', qty: 20 },
      ],
    },
    {
      sku: 'SKU-POLO-BLU-L',
      name: 'Blue Polo Shirt (L)',
      description: 'Standard issue staff uniform blue polo, size Large',
      unit: 'PCS',
      price: 250,
      threshold: 10,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 150 },
        { location: 'BODEGA', qty: 30 },
      ],
    },
    {
      sku: 'SKU-POLO-BLU-XL',
      name: 'Blue Polo Shirt (XL)',
      description: 'Standard issue staff uniform blue polo, size Extra Large',
      unit: 'PCS',
      price: 270,
      threshold: 8,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 60 },
        { location: 'BODEGA', qty: 12 },
      ],
    },
    {
      sku: 'SKU-POLO-WHT-M',
      name: 'White Polo Shirt (M)',
      description: 'Executive white polo uniform, size Medium',
      unit: 'PCS',
      price: 280,
      threshold: 8,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 45 },
        { location: 'STAFF DISPATCH', qty: 10 },
      ],
    },
    {
      sku: 'SKU-POLO-WHT-L',
      name: 'White Polo Shirt (L)',
      description: 'Executive white polo uniform, size Large',
      unit: 'PCS',
      price: 280,
      threshold: 8,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 55 },
        { location: 'STAFF DISPATCH', qty: 8 },
      ],
    },

    // ── PANTS & BOTTOMS ──
    {
      sku: 'SKU-PANTS-BLK-28',
      name: 'Black Slacks (Waist 28)',
      description: 'Staff uniform black slacks, waist 28 inches',
      unit: 'PCS',
      price: 450,
      threshold: 5,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 40 },
      ],
    },
    {
      sku: 'SKU-PANTS-BLK-30',
      name: 'Black Slacks (Waist 30)',
      description: 'Staff uniform black slacks, waist 30 inches',
      unit: 'PCS',
      price: 450,
      threshold: 5,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 60 },
        { location: 'BODEGA', qty: 10 },
      ],
    },
    {
      sku: 'SKU-PANTS-BLK-32',
      name: 'Black Slacks (Waist 32)',
      description: 'Staff uniform black slacks, waist 32 inches',
      unit: 'PCS',
      price: 450,
      threshold: 5,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 75 },
        { location: 'BODEGA', qty: 15 },
      ],
    },
    {
      sku: 'SKU-PANTS-BLK-34',
      name: 'Black Slacks (Waist 34)',
      description: 'Staff uniform black slacks, waist 34 inches',
      unit: 'PCS',
      price: 470,
      threshold: 5,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 50 },
      ],
    },

    // ── FABRICS ──
    {
      sku: 'SKU-FAB-KATRINA-BLU',
      name: 'Katrina Fabric (Blue)',
      description: 'Premium Katrina fabric rolls for apparel production',
      unit: 'Rolls',
      price: 1500,
      threshold: 5,
      stocks: [
        { location: 'BODEGA', qty: 10 },
        { location: 'PRODUCTION FLOOR', qty: 3 },
      ],
    },
    {
      sku: 'SKU-FAB-KATRINA-WHT',
      name: 'Katrina Fabric (White)',
      description: 'Premium Katrina fabric rolls, white for executive uniforms',
      unit: 'Rolls',
      price: 1600,
      threshold: 5,
      stocks: [
        { location: 'BODEGA', qty: 8 },
        { location: 'PRODUCTION FLOOR', qty: 2 },
      ],
    },
    {
      sku: 'SKU-FAB-COTTON-BLK',
      name: 'Cotton Twill Fabric (Black)',
      description: 'Black cotton twill fabric for pants production',
      unit: 'Rolls',
      price: 1200,
      threshold: 4,
      stocks: [
        { location: 'BODEGA', qty: 12 },
        { location: 'PRODUCTION FLOOR', qty: 4 },
      ],
    },
    {
      sku: 'SKU-FAB-LINING-WHT',
      name: 'Lining Fabric (White)',
      description: 'Thin polyester lining for garment interiors',
      unit: 'Rolls',
      price: 600,
      threshold: 6,
      stocks: [
        { location: 'BODEGA', qty: 15 },
        { location: 'PRODUCTION FLOOR', qty: 5 },
      ],
    },

    // ── SEWING SUPPLIES ──
    {
      sku: 'SKU-THREAD-WHT',
      name: 'Sewing Thread (White)',
      description: 'High-strength polyester sewing thread spool',
      unit: 'PCS',
      price: 45,
      threshold: 20,
      stocks: [
        { location: 'BODEGA', qty: 80 },
        { location: 'PRODUCTION FLOOR', qty: 50 },
      ],
    },
    {
      sku: 'SKU-THREAD-BLU',
      name: 'Sewing Thread (Blue)',
      description: 'High-strength polyester sewing thread spool, blue',
      unit: 'PCS',
      price: 45,
      threshold: 20,
      stocks: [
        { location: 'BODEGA', qty: 60 },
        { location: 'PRODUCTION FLOOR', qty: 40 },
      ],
    },
    {
      sku: 'SKU-THREAD-BLK',
      name: 'Sewing Thread (Black)',
      description: 'High-strength polyester sewing thread spool, black',
      unit: 'PCS',
      price: 45,
      threshold: 20,
      stocks: [
        { location: 'BODEGA', qty: 70 },
        { location: 'PRODUCTION FLOOR', qty: 45 },
      ],
    },
    {
      sku: 'SKU-NEEDLE-IND',
      name: 'Industrial Sewing Needles',
      description: 'Pack of 10 industrial machine needles, size 16',
      unit: 'PKS',
      price: 120,
      threshold: 10,
      stocks: [
        { location: 'BODEGA', qty: 30 },
        { location: 'PRODUCTION FLOOR', qty: 15 },
      ],
    },
    {
      sku: 'SKU-BOBBIN-STD',
      name: 'Bobbins (Standard)',
      description: 'Standard pre-wound bobbins, pack of 12',
      unit: 'PKS',
      price: 90,
      threshold: 8,
      stocks: [
        { location: 'PRODUCTION FLOOR', qty: 20 },
      ],
    },
    {
      sku: 'SKU-ZIPPER-BLK-7',
      name: 'Zipper (Black 7")',
      description: 'Metal zipper, 7 inches, black finish',
      unit: 'PCS',
      price: 25,
      threshold: 30,
      stocks: [
        { location: 'BODEGA', qty: 200 },
        { location: 'PRODUCTION FLOOR', qty: 100 },
      ],
    },
    {
      sku: 'SKU-BUTTON-WHT-4H',
      name: 'Buttons (White 4-Hole)',
      description: 'Standard 4-hole shirt buttons, 15mm, pack of 100',
      unit: 'PKS',
      price: 60,
      threshold: 10,
      stocks: [
        { location: 'BODEGA', qty: 50 },
        { location: 'PRODUCTION FLOOR', qty: 20 },
      ],
    },

    // ── SAFETY GEAR ──
    {
      sku: 'SKU-GLOVES-SAF',
      name: 'Safety Gloves',
      description: 'Industrial grade protective hand gloves, latex coated',
      unit: 'PAIRS',
      price: 80,
      threshold: 15,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 200 },
        { location: 'BODEGA', qty: 50 },
        { location: 'PRODUCTION FLOOR', qty: 30 },
      ],
    },
    {
      sku: 'SKU-MASK-N95',
      name: 'N95 Face Mask',
      description: 'NIOSH-certified N95 respirator mask, box of 20',
      unit: 'BOX',
      price: 350,
      threshold: 10,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 50 },
        { location: 'BODEGA', qty: 15 },
        { location: 'STAFF DISPATCH', qty: 5 },
      ],
    },
    {
      sku: 'SKU-GOGGLES-CLR',
      name: 'Safety Goggles (Clear)',
      description: 'Anti-fog clear safety goggles with adjustable strap',
      unit: 'PCS',
      price: 150,
      threshold: 10,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 60 },
        { location: 'PRODUCTION FLOOR', qty: 20 },
      ],
    },
    {
      sku: 'SKU-EARPLUGS-FOAM',
      name: 'Foam Ear Plugs',
      description: 'Disposable foam ear plugs, pack of 50 pairs',
      unit: 'PKS',
      price: 180,
      threshold: 8,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 30 },
        { location: 'PRODUCTION FLOOR', qty: 10 },
      ],
    },
    {
      sku: 'SKU-APRON-DENIM',
      name: 'Denim Work Apron',
      description: 'Heavy-duty denim workshop apron with pockets',
      unit: 'PCS',
      price: 320,
      threshold: 5,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 25 },
        { location: 'PRODUCTION FLOOR', qty: 10 },
      ],
    },

    // ── OFFICE / ID SUPPLIES ──
    {
      sku: 'SKU-LANYARD-BLU',
      name: 'ID Lanyard (Blue)',
      description: 'Breakaway safety lanyard with swivel hook, blue',
      unit: 'PCS',
      price: 35,
      threshold: 20,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 300 },
        { location: 'STAFF DISPATCH', qty: 50 },
      ],
    },
    {
      sku: 'SKU-IDHOLDER-V',
      name: 'ID Card Holder (Vertical)',
      description: 'Clear plastic vertical ID holder with clip',
      unit: 'PCS',
      price: 15,
      threshold: 30,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 500 },
        { location: 'STAFF DISPATCH', qty: 100 },
      ],
    },
    {
      sku: 'SKU-NAMETAG-MAG',
      name: 'Magnetic Name Tag',
      description: 'Reusable magnetic name tag badge, 76x25mm',
      unit: 'PCS',
      price: 65,
      threshold: 15,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 120 },
        { location: 'STAFF DISPATCH', qty: 30 },
      ],
    },

    // ── FOOTWEAR ──
    {
      sku: 'SKU-SHOES-SAF-8',
      name: 'Safety Shoes (Size 8)',
      description: 'Steel-toe safety shoes, anti-slip sole, size 8',
      unit: 'PAIRS',
      price: 1200,
      threshold: 3,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 15 },
      ],
    },
    {
      sku: 'SKU-SHOES-SAF-9',
      name: 'Safety Shoes (Size 9)',
      description: 'Steel-toe safety shoes, anti-slip sole, size 9',
      unit: 'PAIRS',
      price: 1200,
      threshold: 3,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 20 },
      ],
    },
    {
      sku: 'SKU-SHOES-SAF-10',
      name: 'Safety Shoes (Size 10)',
      description: 'Steel-toe safety shoes, anti-slip sole, size 10',
      unit: 'PAIRS',
      price: 1250,
      threshold: 3,
      stocks: [
        { location: 'MAIN WAREHOUSE', qty: 18 },
      ],
    },

    // ── PACKAGING & MISC ──
    {
      sku: 'SKU-GARMENTBAG-L',
      name: 'Garment Bag (Large)',
      description: 'Clear plastic garment cover bag, 24x60 inches',
      unit: 'PCS',
      price: 12,
      threshold: 50,
      stocks: [
        { location: 'BODEGA', qty: 500 },
        { location: 'QC STAGING', qty: 100 },
      ],
    },
    {
      sku: 'SKU-HANGTAG-BRD',
      name: 'Branded Hang Tag',
      description: 'Company-branded cardboard hang tag with string',
      unit: 'PCS',
      price: 5,
      threshold: 100,
      stocks: [
        { location: 'BODEGA', qty: 800 },
        { location: 'QC STAGING', qty: 200 },
      ],
    },
    {
      sku: 'SKU-STICKER-QC',
      name: 'QC Pass Sticker',
      description: 'Round green QC-passed stickers, roll of 500',
      unit: 'ROLL',
      price: 95,
      threshold: 5,
      stocks: [
        { location: 'QC STAGING', qty: 15 },
      ],
    },
    {
      sku: 'SKU-MEASURINGTAPE',
      name: 'Measuring Tape (60")',
      description: 'Soft tailor measuring tape, 60 inches / 150 cm',
      unit: 'PCS',
      price: 30,
      threshold: 10,
      stocks: [
        { location: 'PRODUCTION FLOOR', qty: 25 },
        { location: 'QC STAGING', qty: 10 },
      ],
    },
    {
      sku: 'SKU-SCISSORS-TAI',
      name: 'Tailor Scissors (10")',
      description: 'Professional stainless steel fabric scissors',
      unit: 'PCS',
      price: 280,
      threshold: 4,
      stocks: [
        { location: 'PRODUCTION FLOOR', qty: 12 },
      ],
    },
    {
      sku: 'SKU-IRON-STEAM',
      name: 'Steam Iron (Industrial)',
      description: 'Heavy-duty industrial steam iron, 2200W',
      unit: 'PCS',
      price: 3500,
      threshold: 2,
      stocks: [
        { location: 'PRODUCTION FLOOR', qty: 5 },
        { location: 'QC STAGING', qty: 2 },
      ],
    },
  ];

  for (const pData of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: pData.sku },
      update: {
        name: pData.name,
        description: pData.description,
        unit: pData.unit,
        price: pData.price,
        threshold: pData.threshold,
      },
      create: {
        sku: pData.sku,
        name: pData.name,
        description: pData.description,
        unit: pData.unit,
        price: pData.price,
        threshold: pData.threshold,
      },
    });

    console.log(`Product: ${product.name} (SKU: ${product.sku}) is ready.`);

    for (const stockInfo of pData.stocks) {
      const loc = locations[stockInfo.location];
      await prisma.productStock.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: loc.id,
          },
        },
        update: {
          quantity: stockInfo.qty,
        },
        create: {
          productId: product.id,
          locationId: loc.id,
          quantity: stockInfo.qty,
        },
      });
      console.log(
        `  - Stock: ${stockInfo.qty} ${pData.unit} in ${stockInfo.location}`,
      );
    }
  }

  console.log(`\n✅ Inventory seeding complete!`);
  console.log(`   📦 ${productsData.length} products created/updated`);
  console.log(`   📍 ${locationNames.length} locations created/updated`);
  console.log(
    `   📊 ${productsData.reduce((acc, p) => acc + p.stocks.length, 0)} stock entries set`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
