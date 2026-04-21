import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Delete } from '@nestjs/common';
import { InternalRequestsService } from './internal-requests.service';

@Controller('internal-requests')
export class InternalRequestsController {
  constructor(private readonly internalRequestsService: InternalRequestsService) {}

  @Post()
  create(@Body() createRequestDto: any) {
    return this.internalRequestsService.create(createRequestDto);
  }

  @Post('bulk')
  bulkCreate(@Body() body: { requests: any[] }) {
    return this.internalRequestsService.bulkCreate(body.requests);
  }

  @Get()
  findAll() {
    return this.internalRequestsService.findAll();
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; remarks?: string; userId?: string },
  ) {
    const userId = body.userId || 'admin-system'; 
    return this.internalRequestsService.updateStatus(id, body.status, userId, body.remarks);
  }

  @Post('bulk-status')
  bulkUpdateStatus(@Body() body: { ids: string[]; status: string; remarks?: string; userId?: string }) {
    const userId = body.userId || 'admin-system';
    return this.internalRequestsService.bulkUpdateStatus(body.ids, body.status, userId, body.remarks);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.internalRequestsService.remove(id);
  }

  @Post('bulk-delete')
  bulkRemove(@Body() body: { ids: string[] }) {
    return this.internalRequestsService.bulkRemove(body.ids);
  }
}
