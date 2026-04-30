const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const allFieldValues = await prisma.itemFieldValue.findMany({
        select: {
            value: true,
            itemId: true
        }
    });

    const withUnitQty = allFieldValues.filter(fv => fv.value && typeof fv.value === 'object' && fv.value.useUnitQty !== undefined);

    console.log(`Found ${withUnitQty.length} field values with useUnitQty`);
    
    const types = {};
    withUnitQty.forEach(fv => {
        const type = typeof fv.value.useUnitQty;
        types[type] = (types[type] || 0) + 1;
        if (type !== 'boolean') {
            console.log(`Item ${fv.itemId} has useUnitQty as ${type}:`, fv.value.useUnitQty);
        }
    });

    console.log('Types found:', types);
}

main().catch(console.error).finally(() => prisma.$disconnect());
