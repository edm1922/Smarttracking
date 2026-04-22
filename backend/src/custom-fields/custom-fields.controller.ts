import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('custom-fields')
@UseGuards(AuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  findAll() {
    return this.customFieldsService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.customFieldsService.create(data);
  }

  @Patch('reorder')
  reorder(@Body() data: { id: string; orderIndex: number }[]) {
    return this.customFieldsService.reorder(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.customFieldsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customFieldsService.remove(id);
  }
}
