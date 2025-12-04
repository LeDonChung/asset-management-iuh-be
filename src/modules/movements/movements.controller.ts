import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import {
  UpdateMovementDto,
  UpdateMovementStatusDto,
  ProposeMovementDto,
  ApproveMovementDto,
  RejectMovementDto,
  ExecuteMovementDto,
} from './dto/update-movement.dto';
import { MovementFilterDto, SimplifiedMovementFilterDto } from './dto/filter-movement.dto';
import { MovementResponseDto, SimplifiedMovementResponseDto } from './dto/movement-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { Permissions } from 'src/modules/auth/decorators/permissions.decorator';
import { PermissionConstants } from 'src/common/utils/permission.constant';

@ApiTags('Movements')
@Controller('api/v1/movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo mới yêu cầu di chuyển tài sản',
    description:
      'Tạo yêu cầu di chuyển tài sản giữa các phòng. Trạng thái mặc định là DRAFT. Nếu chọn PENDING_APPROVAL và có quyền APPROVE_MOVEMENT thì sẽ tự động chuyển sang APPROVED.',
  })
  @ApiResponse({
    status: 201,
    description: 'Yêu cầu di chuyển đã được tạo thành công',
    type: MovementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền thực hiện' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_CREATE_MOVEMENT)
  create(
    @Body() createDto: CreateMovementDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.movementsService.createMovement(createDto, currentUser.id, currentUser);
  }

  @Post('filter/simplified')
  @ApiOperation({
    summary: 'Lọc danh sách yêu cầu di chuyển (phiên bản rút gọn)',
    description:
      'Lọc và phân trang danh sách yêu cầu di chuyển với thông tin rút gọn để hiển thị tổng quan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách yêu cầu di chuyển rút gọn với phân trang',
    type: PaginatedResponseDto<SimplifiedMovementResponseDto>,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_VIEW_MOVEMENT)
  async filterSimplified(
    @Body() filterDto: SimplifiedMovementFilterDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedResponseDto<SimplifiedMovementResponseDto>> {
    return this.movementsService.findAllSimplified(filterDto, currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết yêu cầu di chuyển',
    description:
      'Lấy thông tin chi tiết của một yêu cầu di chuyển bao gồm danh sách tài sản và lịch sử thay đổi.',
  })
  @ApiParam({ name: 'id', description: 'ID của yêu cầu di chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết yêu cầu di chuyển',
    type: MovementResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu di chuyển' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_VIEW_MOVEMENT)
  findOne(@Param('id') id: string) {
    return this.movementsService.getMovementById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật yêu cầu di chuyển',
    description:
      'Cập nhật thông tin yêu cầu di chuyển. Chỉ có thể cập nhật khi yêu cầu đang ở trạng thái DRAFT. Có thể thay đổi trạng thái, nếu chọn PENDING_APPROVAL và có quyền APPROVE_MOVEMENT thì sẽ tự động chuyển sang APPROVED.',
  })
  @ApiParam({ name: 'id', description: 'ID của yêu cầu di chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu di chuyển đã được cập nhật thành công',
    type: MovementResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ hoặc không thể cập nhật yêu cầu',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu di chuyển' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_UPDATE_MOVEMENT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMovementDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.movementsService.updateMovement(id, updateDto, currentUser);
  }

  @Patch(':id/propose')
  @ApiOperation({
    summary: 'Đề xuất yêu cầu di chuyển',
    description:
      'Gửi đề xuất yêu cầu di chuyển từ trạng thái DRAFT sang PENDING_APPROVAL để chờ phê duyệt.',
  })
  @ApiParam({ name: 'id', description: 'ID của yêu cầu di chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu di chuyển đã được đề xuất thành công',
    type: MovementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Không thể đề xuất yêu cầu di chuyển' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu di chuyển' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_PROPOSE_MOVEMENT)
  proposeMovement(
    @Param('id') id: string,
    @Body() proposeDto: ProposeMovementDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.movementsService.proposeMovement(
      id,
      proposeDto,
      currentUser.id,
    );
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Phê duyệt yêu cầu di chuyển',
    description:
      'Phê duyệt yêu cầu di chuyển từ trạng thái PENDING_APPROVAL sang APPROVED.',
  })
  @ApiParam({ name: 'id', description: 'ID của yêu cầu di chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu di chuyển đã được phê duyệt thành công',
    type: MovementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Không thể phê duyệt yêu cầu di chuyển' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu di chuyển' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_APPROVE_MOVEMENT)
  approveMovement(
    @Param('id') id: string,
    @Body() approveDto: ApproveMovementDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.movementsService.approveMovement(
      id,
      approveDto,
      currentUser.id,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Từ chối yêu cầu di chuyển',
    description:
      'Từ chối yêu cầu di chuyển từ trạng thái PENDING_APPROVAL hoặc APPROVED sang REJECTED.',
  })
  @ApiParam({ name: 'id', description: 'ID của yêu cầu di chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu di chuyển đã được từ chối thành công',
    type: MovementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Không thể từ chối yêu cầu di chuyển' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu di chuyển' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_REJECT_MOVEMENT)
  rejectMovement(
    @Param('id') id: string,
    @Body() rejectDto: RejectMovementDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.movementsService.rejectMovement(
      id,
      rejectDto,
      currentUser.id,
    );
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái yêu cầu di chuyển',
    description:
      'Cập nhật trạng thái yêu cầu di chuyển theo workflow: DRAFT → PENDING_APPROVAL → APPROVED → COMPLETED hoặc REJECTED/CANCELLED. Khi COMPLETED, tài sản sẽ tự động được cập nhật vị trí.',
  })
  @ApiParam({ name: 'id', description: 'ID của yêu cầu di chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái đã được cập nhật',
    type: MovementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Chuyển trạng thái không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu di chuyển' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_UPDATE_MOVEMENT)
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateMovementStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.movementsService.updateMovementStatus(
      id,
      updateDto.status,
      currentUser.id,
      updateDto.note || 'Cập nhật trạng thái',
      {
        approvalNote: updateDto.approvalNote,
        rejectionReason: updateDto.rejectionReason,
        evidenceUrl: updateDto.evidenceUrl,
      },
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa yêu cầu di chuyển',
    description:
      'Xóa yêu cầu di chuyển. Chỉ có thể xóa yêu cầu ở trạng thái DRAFT, REJECTED hoặc CANCELLED.',
  })
  @ApiParam({ name: 'id', description: 'ID của yêu cầu di chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu di chuyển đã được xóa thành công',
  })
  @ApiResponse({ status: 400, description: 'Không thể xóa yêu cầu di chuyển' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu di chuyển' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_REMOVE_MOVEMENT)
  async remove(@Param('id') id: string) {
    await this.movementsService.removeMovement(id);
    return { message: 'Yêu cầu di chuyển đã được xóa thành công' };
  }
}
