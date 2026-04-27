import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InternalRequestsService } from './internal-requests.service';

@Controller('internal-requests')
export class InternalRequestsController {
  constructor(
    private readonly internalRequestsService: InternalRequestsService,
  ) {}

  @Post()
  create(@Body() createRequestDto: any) {
    return this.internalRequestsService.create(createRequestDto);
  }

  @Post('bulk')
  bulkCreate(@Body() body: { requests: any[] }) {
    return this.internalRequestsService.bulkCreate(body.requests);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(@UploadedFile() file: any) {
    return this.internalRequestsService.uploadAttachment(file);
  }

  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.internalRequestsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
      status,
    });
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; remarks?: string; userId?: string },
  ) {
    const userId = body.userId || 'admin-system';
    return this.internalRequestsService.updateStatus(
      id,
      body.status,
      userId,
      body.remarks,
    );
  }

  @Post('bulk-status')
  bulkUpdateStatus(
    @Body()
    body: {
      ids: string[];
      status: string;
      remarks?: string;
      userId?: string;
    },
  ) {
    const userId = body.userId || 'admin-system';
    return this.internalRequestsService.bulkUpdateStatus(
      body.ids,
      body.status,
      userId,
      body.remarks,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.internalRequestsService.remove(id);
  }

  @Get('employees')
  getEmployees() {
    return this.internalRequestsService.getUniqueEmployees();
  }

  @Post('bulk-delete')
  bulkRemove(@Body() body: { ids: string[] }) {
    return this.internalRequestsService.bulkRemove(body.ids);
  }
}
