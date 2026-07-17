import { 
  Controller, 
  Get,
  Post, 
  Patch,
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
        releaseDate: body.release_date,
        label: body.label || body.client_name,
        remark: body.remark
      };

      const result = await this.payrollService.processMasterPdf(files[0].buffer, batchData);
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

  @Get('processing-status')
  async getProcessingStatus() {
    return this.payrollService.getProcessingStatus();
  }

  @Delete('batch/:id')
  async deleteBatch(@Param('id') id: string) {
    return this.payrollService.deleteBatch(id);
  }

  @Post('sync-bulk')
  async syncBulk(@Body() body: { text: string; label?: string }) {
    return this.payrollService.syncBulkEmployees(body.text, body.label);
  }

  @Post('portal-login')
  async portalLogin(@Body() body: any) {
    return this.payrollService.portalLogin(body.username, body.password);
  }

  @Post('portal-change-password')
  async changePassword(@Body() body: any) {
    return this.payrollService.changePassword(body.userId, body.currentPassword, body.newPassword);
  }

  @Post('revise')
  @UseInterceptors(FilesInterceptor('file'))
  async reviseDocuments(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { batchId: string; selectedSysIds: string; remark?: string }
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    const sysIds = JSON.parse(body.selectedSysIds || '[]');
    return this.payrollService.reviseDocuments(body.batchId, sysIds, body.remark || '', files[0].buffer);
  }

  @Get('my-payslips/:sysId')
  async getMyPayslips(@Param('sysId') sysId: string) {
    return this.payrollService.getEmployeePayslips(sysId);
  }

  @Post('get-upload-url')
  async getUploadUrl(@Body() body: { fileName: string }) {
    return this.payrollService.getSignedUploadUrl(body.fileName);
  }

  @Post('process-uploaded')
  async processUploaded(@Body() body: any) {
    const { filePath, resumeBatchId, ...batchDataRaw } = body;
    console.log(`[process-uploaded] filePath=${filePath}, resumeBatchId=${resumeBatchId}, body keys=${Object.keys(body).join(',')}`);

    const batchData = {
      clientName: batchDataRaw.client_name,
      periodStart: batchDataRaw.period_start,
      periodEnd: batchDataRaw.period_end,
      releaseDate: batchDataRaw.release_date,
      label: batchDataRaw.label || batchDataRaw.client_name,
      remark: batchDataRaw.remark,
      resumeBatchId: resumeBatchId,
      sourcePath: filePath,
    };

    // IMPORTANT: On Vercel serverless, fire-and-forget Promises are killed when the
    // response is sent. We must AWAIT the work so the lambda stays alive. The service
    // returns when its time budget is hit; the client re-invokes this endpoint with
    // resumeBatchId until processing is complete.
    try {
      const result = await this.payrollService.processRemoteMasterPdf(
        filePath,
        batchData,
      );
      return result;
    } catch (err: any) {
      console.error('PDF processing failed:', err);
      throw new HttpException(
        err?.message || 'Failed to process PDF',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('stop-processing/:id')
  async stopProcessing(@Param('id') id: string) {
    return this.payrollService.cancelBatchProcessing(id);
  }

  @Get('all-payslips')
  async getAllPayslips() {
    return this.payrollService.getAllPayslips();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.payrollService.deleteEmployee(id);
  }

  @Delete('users-bulk')
  async bulkDeleteUsers(@Body() body: { ids: string[] }) {
    return this.payrollService.bulkDeleteEmployees(body.ids);
  }

  @Get('companies')
  async getCompanies() {
    return this.payrollService.getCompanies();
  }

  @Post('companies')
  async saveCompany(@Body() body: { name: string }) {
    return this.payrollService.saveCompany(body.name);
  }

  @Delete('companies/:id')
  async deleteCompany(@Param('id') id: string) {
    return this.payrollService.deleteCompany(id);
  }

  @Post('requests')
  async createRequest(@Body() body: any) {
    try {
      return await this.payrollService.createPayrollRequest(body.userId, body);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create payroll request',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('requests/pending')
  async getPendingRequests() {
    try {
      return await this.payrollService.getPendingRequests();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch pending requests',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('requests/staff/:userId')
  async getStaffRequests(@Param('userId') userId: string) {
    try {
      return await this.payrollService.getStaffRequests(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to fetch staff requests',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('requests/:id/status')
  async respondToRequest(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' }
  ) {
    try {
      return await this.payrollService.respondToRequest(id, body.status);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to respond to request',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
