import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  findAll() {
    return this.locationsService.findAll();
  }

  @Post()
  create(@Body() data: { name: string; description?: string }) {
    return this.locationsService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { name: string; description?: string }) {
    return this.locationsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
