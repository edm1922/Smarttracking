import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/auth.guard';
import { ReportFilterDto } from './dto/report-filter.dto';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('analytics')
  getAnalytics(
    @Query('locationId') locationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getAnalytics(locationId, startDate, endDate);
  }

  @Get('report-data')
  getReportData(
    @Query('type') type: string,
    @Query('productId') productId?: string,
  ) {
    return this.service.getReportData(type, { productId });
  }

  // --- New Analytics Endpoints ---

  @Get('most-issued-products')
  getMostIssuedProducts(@Query() query: ReportFilterDto) {
    return this.service.getMostIssuedProducts(query.startDate, query.endDate);
  }

  @Get('daily-stock-movement')
  getDailyStockMovement(@Query() query: ReportFilterDto) {
    return this.service.getDailyStockMovement(query.startDate, query.endDate);
  }

  @Get('by-location')
  getIssuancesByLocation(@Query() query: ReportFilterDto) {
    return this.service.getIssuancesByLocation(query.startDate, query.endDate);
  }

  @Get('status-distribution')
  getRequestStatusDistribution(@Query() query: ReportFilterDto) {
    return this.service.getRequestStatusDistribution(query.startDate, query.endDate);
  }

  @Get('top-employees')
  getTopEmployees(@Query() query: ReportFilterDto) {
    return this.service.getTopEmployees(query.startDate, query.endDate);
  }

  @Get('product-trend/:id')
  getProductUsageTrend(
    @Param('id') id: string,
    @Query() query: ReportFilterDto,
  ) {
    return this.service.getProductUsageTrend(id, query.startDate, query.endDate);
  }

  @Get('low-stock')
  getLowStockAlertReport() {
    return this.service.getLowStockAlertReport();
  }

  @Get('batch-analytics')
  getBatchLevelAnalytics() {
    return this.service.getBatchLevelAnalytics();
  }
}
