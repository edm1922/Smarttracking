
import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { RsqService } from './rsq.service';

@Controller('rsq')
export class RsqController {
  constructor(private readonly rsqService: RsqService) {}

  @Get('fabrics')
  getFabrics() {
    return this.rsqService.getFabrics();
  }

  @Post('fabrics')
  createFabric(@Body() data: any) {
    return this.rsqService.createFabric(data);
  }

  @Get('tailors')
  getTailors() {
    return this.rsqService.getTailors();
  }

  @Get('requests')
  getRequests() {
    return this.rsqService.getRequests();
  }

  @Get('transactions')
  getTransactions(@Query('fabricId') fabricId?: string) {
    return this.rsqService.getTransactions({ fabricId });
  }

  @Post('requests')
  createRequest(@Body() data: any) {
    return this.rsqService.createRequest(data);
  }

  @Post('transactions')
  createTransaction(@Body() data: any) {
    return this.rsqService.createFabricTransaction(data);
  }

  @Get('next-sequence')
  getNextSequence() {
    return this.rsqService.getNextSequences();
  }

  @Post('batch')
  createBatch(@Body('items') items: any[]) {
    return this.rsqService.createBatchTransactions(items);
  }

  @Patch('requests/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('quantityReceived') quantityReceived?: number,
  ) {
    return this.rsqService.updateRequestStatus(id, status, quantityReceived);
  }

  @Post('transactions/bulk-delete')
  deleteTransactions(@Body('ids') ids: string[]) {
    return this.rsqService.deleteTransactions(ids);
  }
}

