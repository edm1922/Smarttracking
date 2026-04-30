import { PrismaClient } from '@prisma/client';
import { ItemsService } from './src/items/items.service';

const prisma = new PrismaClient();
// Mocking the dependencies for ItemsService
const mockLogsService = {} as any;
const mockSupabaseService = {} as any;
const mockWorkflowService = {} as any;
const mockProductsService = {} as any;

const itemsService = new ItemsService(
    prisma,
    mockLogsService,
    mockSupabaseService,
    mockWorkflowService,
    mockProductsService
);

async function main() {
    console.log('Testing ItemsService.getUnitInventory()...');
    const result = await itemsService.getUnitInventory({ skip: 0, take: 100 });
    console.log('Result total:', result.total);
    console.log('Result data length:', result.data.length);
    if (result.data.length > 0) {
        console.log('First result item name:', result.data[0].name);
        console.log('First result item units count:', result.data[0].items.length);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
