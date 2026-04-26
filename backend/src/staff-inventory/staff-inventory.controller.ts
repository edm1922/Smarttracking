import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { StaffInventoryService } from './staff-inventory.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('staff-inventory')
@UseGuards(AuthGuard)
export class StaffInventoryController {
  constructor(private readonly staffInventoryService: StaffInventoryService) {}

  @Get('mine')
  async findMine(@Req() req: any) {
    return this.staffInventoryService.findMine(req.user.sub);
  }

  @Post('adjust')
  async adjust(@Req() req: any, @Body() data: any) {
    return this.staffInventoryService.adjust(req.user.sub, data);
  }

  @Post('release')
  async release(@Req() req: any, @Body() data: any) {
    return this.staffInventoryService.release(req.user.sub, data);
  }

  @Post('bulk-release')
  async bulkRelease(@Req() req: any, @Body() data: any) {
    return this.staffInventoryService.bulkRelease(req.user.sub, data.releases);
  }

  @Get('releases')
  async findMyReleases(@Req() req: any) {
    return this.staffInventoryService.findMyReleases(req.user.sub);
  }

  @Post('delete') // Using POST for delete to simplify body handling in some clients, or use DELETE
  async remove(@Req() req: any, @Body() data: any) {
    return this.staffInventoryService.remove(req.user.sub, data);
  }

  @Post('update')
  async update(@Req() req: any, @Body() data: any) {
    return this.staffInventoryService.update(req.user.sub, data);
  }

  // Admin Endpoints
  @Get('admin/activities')
  async findAllActivities() {
    return this.staffInventoryService.findAllActivities();
  }

  @Get('admin/inventory')
  async findAllStaffInventory() {
    return this.staffInventoryService.findAllStaffInventory();
  }
}
