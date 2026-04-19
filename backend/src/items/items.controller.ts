import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ItemsService } from './items.service';
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.itemsService.create(data, req.user.id);
  }

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.itemsService.findOne(slug);
  }

  @UseGuards(AuthGuard)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() data: any, @Request() req: any) {
    return this.itemsService.update(slug, data, req.user.id, req.user.role);
  }

  @UseGuards(AuthGuard)
  @Patch(':slug/lock')
  toggleLock(@Param('slug') slug: string, @Request() req: any) {
    return this.itemsService.toggleLock(slug, req.user.id, req.user.role);
  }

  @UseGuards(AuthGuard)
  @Post(':slug/image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(@Param('slug') slug: string, @UploadedFile() file: any, @Request() req: any) {
    return this.itemsService.uploadImage(slug, file, req.user.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.itemsService.remove(slug);
  }
}
