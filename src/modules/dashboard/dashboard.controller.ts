import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';

@ApiTags('Dashboard')
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ 
    summary: 'Lấy thống kê tổng quan cho dashboard',
    description: 'Trả về thống kê tài sản, giao dịch, di chuyển và hoạt động gần đây'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getDashboardStats(@CurrentUser() currentUser: User): Promise<DashboardStatsDto> {
    return this.dashboardService.getDashboardStats(currentUser);
  }
}

