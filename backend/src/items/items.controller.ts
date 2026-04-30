import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.itemsService.create(data, req.user.sub);
  }

  @Get()
  findAll(@Query('batchId') batchId?: string) {
    return this.itemsService.findAll(batchId);
  }

  @Get('unit-inventory')
  getUnitInventory(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.itemsService.getUnitInventory({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
    });
  }

  @Get('unit-inventory-summary')
  getUnitInventorySummary() {
    return this.itemsService.getUnitInventorySummary();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.itemsService.findOne(slug);
  }

  @Post(':slug/submit-form')
  submitForm(@Param('slug') slug: string, @Body() data: any) {
    return this.itemsService.submitForm(slug, data);
  }

  @UseGuards(AuthGuard)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() data: any, @Request() req: any) {
    return this.itemsService.update(slug, data, req.user.sub, req.user.role);
  }

  @UseGuards(AuthGuard)
  @Patch(':slug/lock')
  toggleLock(@Param('slug') slug: string, @Request() req: any) {
    return this.itemsService.toggleLock(slug, req.user.sub, req.user.role);
  }

  @UseGuards(AuthGuard)
  @Post(':slug/image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @Param('slug') slug: string,
    @UploadedFile() file: any,
    @Request() req: any,
    @Query('slot') slot: string,
  ) {
    return this.itemsService.uploadImage(slug, file, req.user.sub, parseInt(slot, 10) || 1);
  }

  @UseGuards(AuthGuard)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.itemsService.remove(slug);
  }
}
