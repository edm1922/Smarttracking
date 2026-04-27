import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('stockFilter') stockFilter?: string,
  ) {
    return this.productsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
      stockFilter,
    });
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.productsService.create({ ...data, userId: req.user.sub });
  }

  @Post('bulk-release')
  bulkRelease(@Body() data: any, @Request() req: any) {
    return this.productsService.bulkRelease({ ...data, userId: req.user.sub });
  }

  @Post(':id/stock')
  processStock(
    @Param('id') productId: string,
    @Body()
    data: {
      locationId: string;
      type: 'IN' | 'OUT';
      quantity: number;
      remarks?: string;
    },
    @Request() req: any,
  ) {
    return this.productsService.processStock(
      productId,
      data.locationId,
      req.user.sub,
      data.type,
      data.quantity,
      data.remarks,
    );
  }

  @Patch(':id/adjust-stock')
  manualStockAdjustment(
    @Param('id') productId: string,
    @Body()
    data: { locationId: string; newTotalQuantity: number; remarks?: string },
    @Request() req: any,
  ) {
    return this.productsService.manualStockAdjustment(
      productId,
      data.locationId,
      req.user.sub,
      data.newTotalQuantity,
      data.remarks,
    );
  }

  @Get('logs')
  getLogs() {
    return this.productsService.getTransactionLogs();
  }

  @Patch('logs/:id')
  updateLog(@Param('id') id: string, @Body() data: any) {
    return this.productsService.updateLog(id, data);
  }

  @Delete('logs/:id')
  removeLog(@Param('id') id: string) {
    return this.productsService.removeLog(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.productsService.uploadImage(id, file);
  }
}
