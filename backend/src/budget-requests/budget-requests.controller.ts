import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BudgetRequestsService } from './budget-requests.service';

@Controller('budget-requests')
export class BudgetRequestsController {
  constructor(
    private readonly budgetRequestsService: BudgetRequestsService,
  ) {}

  @Post()
  create(@Body() data: any) {
    return this.budgetRequestsService.create(data);
  }

  @Get()
  findAll() {
    return this.budgetRequestsService.findAll();
  }

  @Get('next-no')
  getNextBgtNo() {
    return this.budgetRequestsService.getNextBgtNo();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.budgetRequestsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.budgetRequestsService.remove(id);
  }
}
