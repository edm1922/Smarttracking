import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { TransmittalsService } from './transmittals.service';

@Controller('transmittals')
export class TransmittalsController {
  constructor(private readonly service: TransmittalsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('next-no')
  getNextNo() {
    return this.service.getNextTransmittalNo();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
