import { 
  Controller, 
  Get,
  Post, 
  Delete,
  UseInterceptors, 
  UploadedFile,
  UploadedFiles,
  Body, 
  Param,
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadPayroll(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      // Parse JSON from body fields if they come as strings
      const batchData = {
        clientName: body.client_name,
        periodStart: body.period_start,
        periodEnd: body.period_end,
        label: body.label || body.client_name
      };

      const result = await this.payrollService.processMasterPdf(files[0], batchData);
      return result;
    } catch (error) {
      console.error('Payroll Upload Error:', error);
      throw new HttpException(
        `Failed to process payroll: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('users')
  async getUsers() {
    return this.payrollService.getEmployees();
  }

  @Get('runs')
  async getRuns() {
    return this.payrollService.getBatches();
  }

  @Get('latest-run')
  async getLatestRun() {
    return this.payrollService.getLatestBatch();
  }

  @Post('sync-bulk')
  async syncBulk(@Body('text') text: string) {
    return this.payrollService.syncBulkEmployees(text);
  }

  @Get('my-payslips/:sysId')
  async getMyPayslips(@Param('sysId') sysId: string) {
    return this.payrollService.getEmployeePayslips(sysId);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.payrollService.deleteEmployee(id);
  }
}
