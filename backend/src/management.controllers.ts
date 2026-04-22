import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CategoriesService } from './categories/categories.service';
import { TagsService } from './tags/tags.service';
import { BatchesService } from './batches/batches.service';
import { WorkflowService } from './workflow/workflow.service';
import { ReportsService } from './reports/reports.service';
import { ExcelGeneratorService } from './reports/excel-generator.service';
import { AuthGuard } from './auth/auth.guard';

@Controller('categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Get() findAll() {
    return this.service.findAll();
  }
  @Post() create(@Body() data: any) {
    return this.service.create(data);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Controller('tags')
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly service: TagsService) {}
  @Get() findAll() {
    return this.service.findAll();
  }
  @Post() create(@Body() data: any) {
    return this.service.create(data);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Controller('batches')
@UseGuards(AuthGuard)
export class BatchesController {
  constructor(private readonly service: BatchesService) {}
  @Get() findAll() {
    return this.service.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Post() create(@Body() data: any) {
    return this.service.create(data);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Controller('workflow')
@UseGuards(AuthGuard)
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}
  @Get('statuses') findAllStatuses() {
    return this.service.findAllStatuses();
  }
  @Post('statuses') createStatus(@Body() data: any) {
    return this.service.createStatus(data);
  }
  @Post('transitions') addTransition(@Body() data: any) {
    return this.service.addTransition(data.fromStatusId, data.toStatusId);
  }
  @Delete('transitions/:id') removeTransition(@Param('id') id: string) {
    return this.service.removeTransition(id);
  }
}

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    private readonly excelService: ExcelGeneratorService,
  ) {}
  @Get('summary') getSummary() {
    return this.service.getSummary();
  }
  @Get('analytics') getAnalytics(@Query('locationId') locationId?: string) {
    return this.service.getAnalytics(locationId);
  }
  @Get('report-data') getReportData(
    @Query('type') type: string,
    @Query('productId') productId?: string,
  ) {
    return this.service.getReportData(type, { productId });
  }

  @Post('uniform-stocks/export')
  async exportUniformStocks(
    @Body() body: { header_config: any; filters: any },
    @Res() res: Response,
  ) {
    return this.excelService.generateUniformStocksReport(
      res,
      body.header_config,
      body.filters,
    );
  }
}
