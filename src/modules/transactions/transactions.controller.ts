import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  UpdateTransactionDto,
  UpdateTransactionStatusDto,
  ProposeTransactionDto,
  ApproveTransactionDto,
  RejectTransactionDto,
} from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/filter-transaction.dto';
import { TransactionResponseDto, SimplifiedTransactionResponseDto } from './dto/response-transaction.dto';
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

@ApiTags('Transactions')
@Controller('api/v1/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo mới giao dịch bàn giao',
    description:
      'Tạo giao dịch bàn giao tài sản giữa các đơn vị hoặc phòng ban. Hỗ trợ 3 loại: TRANSFER (bàn giao giữa đơn vị), INTERNAL_MOVE (di chuyển nội bộ), ALLOCATION (phân bổ tài sản mới).',
  })
  @ApiResponse({
    status: 201,
    description: 'Giao dịch đã được tạo thành công',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền thực hiện' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_CREATE_TRANSACTION)
  create(
    @Body() createDto: CreateTransactionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.transactionsService.createTransaction(createDto, currentUser.id);
  }

  @Post('filter/simplified')
  @ApiOperation({
    summary: 'Lọc danh sách giao dịch (phiên bản rút gọn)',
    description:
      'Lọc và phân trang danh sách giao dịch với thông tin rút gọn để hiển thị tổng quan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách giao dịch rút gọn với phân trang',
    type: PaginatedResponseDto<SimplifiedTransactionResponseDto>,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  async filterSimplified(
    @Body() filterDto: TransactionFilterDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedResponseDto<SimplifiedTransactionResponseDto>> {
    return this.transactionsService.findAllSimplified(filterDto, currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết giao dịch bàn giao',
    description:
      'Lấy thông tin chi tiết của một giao dịch bao gồm danh sách tài sản và lịch sử thay đổi.',
  })
  @ApiParam({ name: 'id', description: 'ID của giao dịch' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết giao dịch',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.transactionsService.getTransactionById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật giao dịch bàn giao',
    description:
      'Cập nhật thông tin giao dịch. Chỉ có thể cập nhật khi giao dịch đang ở trạng thái DRAFT (nháp).',
  })
  @ApiParam({ name: 'id', description: 'ID của giao dịch' })
  @ApiResponse({
    status: 200,
    description: 'Giao dịch đã được cập nhật thành công',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ hoặc không thể cập nhật giao dịch',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_UPDATE_TRANSACTION)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.transactionsService.updateTransaction(
      id,
      updateDto,
    );
  }

  @Patch(':id/propose')
  @ApiOperation({
    summary: 'Đề xuất giao dịch bàn giao',
    description:
      'Gửi đề xuất giao dịch từ trạng thái DRAFT sang PROPOSED để chờ phê duyệt.',
  })
  @ApiParam({ name: 'id', description: 'ID của giao dịch' })
  @ApiResponse({
    status: 200,
    description: 'Giao dịch đã được đề xuất thành công',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Không thể đề xuất giao dịch' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_PROPOSE_TRANSACTION)
  proposeTransaction(
    @Param('id') id: string,
    @Body() proposeDto: ProposeTransactionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.transactionsService.proposeTransaction(
      id,
      proposeDto,
      currentUser.id,
    );
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Phê duyệt giao dịch bàn giao',
    description:
      'Phê duyệt giao dịch từ trạng thái PROPOSED sang APPROVED.',
  })
  @ApiParam({ name: 'id', description: 'ID của giao dịch' })
  @ApiResponse({
    status: 200,
    description: 'Giao dịch đã được phê duyệt thành công',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Không thể phê duyệt giao dịch' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_APPROVE_TRANSACTION)
  approveTransaction(
    @Param('id') id: string,
    @Body() approveDto: ApproveTransactionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.transactionsService.approveTransaction(
      id,
      approveDto,
      currentUser.id,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Từ chối giao dịch bàn giao',
    description:
      'Từ chối giao dịch từ trạng thái PROPOSED hoặc APPROVED sang REJECTED.',
  })
  @ApiParam({ name: 'id', description: 'ID của giao dịch' })
  @ApiResponse({
    status: 200,
    description: 'Giao dịch đã được từ chối thành công',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Không thể từ chối giao dịch' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_REJECT_TRANSACTION)
  rejectTransaction(
    @Param('id') id: string,
    @Body() rejectDto: RejectTransactionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.transactionsService.rejectTransaction(
      id,
      rejectDto,
      currentUser.id,
    );
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái giao dịch',
    description:
      'Cập nhật trạng thái giao dịch theo workflow: DRAFT → PROPOSED → APPROVED hoặc REJECTED. Khi APPROVED, tài sản sẽ tự động được cập nhật vị trí và sổ tài sản.',
  })
  @ApiParam({ name: 'id', description: 'ID của giao dịch' })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái đã được cập nhật',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Chuyển trạng thái không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Permissions(PermissionConstants.PERM_UPDATE_TRANSACTION_STATUS)
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    // This is a generic status update method that can handle any status change
    // For specific workflows, use the dedicated endpoints above
    return this.transactionsService.updateTransactionStatus(
      id,
      updateDto.status,
      currentUser.id,
      updateDto.note || 'Cập nhật trạng thái',
      {
        approvalNote: updateDto.approvalNote,
        rejectionReason: updateDto.rejectionReason,
      },
    );
  }
}
