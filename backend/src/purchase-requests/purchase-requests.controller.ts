import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';

@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly purchaseRequestsService: PurchaseRequestsService) {}

  @Post()
  create(@Body() data: any) {
    return this.purchaseRequestsService.create(data);
  }

  @Get()
  findAll() {
    return this.purchaseRequestsService.findAll();
  }
  
  @Get('next-no')
  getNextPrNo(@Query('date') date: string) {
    return this.purchaseRequestsService.getNextPrNo(date);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.purchaseRequestsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseRequestsService.remove(id);
  }
}
