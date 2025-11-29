import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards, UseInterceptors, UploadedFile } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiParam, ApiResponse, ApiTags, ApiOperation } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AlertsService } from "./alerts.service";
import { MovementsService } from "../movements/movements.service";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";
import { UserAlertResponseDto } from "./dto/user-alert-response.dto";
import { UpdateAlertDto } from "./dto/update-alert.dto";
import { UpdateAlertImageDto } from "./dto/update-alert-image.dto";
import { FilesService } from "../files/files.service";
import { AlertFilterDto } from "./dto/alert-filter.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination.dto";
import { SendAlertEmailDto, SendAlertEmailResponseDto } from "./dto/send-alert-email.dto";

@ApiTags('Alerts')
@Controller('api/v1/alerts')
export class AlertsController {
    constructor(
        private readonly alertsService: AlertsService,
        private readonly movementsService: MovementsService,
    ) { }

    @Post("filter")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Lấy danh sách cảnh báo với bộ lọc và phân trang",
        description: "Lọc cảnh báo theo trạng thái, ngày tạo từ-đến, loại cảnh báo với phân trang"
    })
    @ApiResponse({
        status: 200,
        description: "Danh sách cảnh báo với phân trang",
        type: PaginatedResponseDto,
    })
    @ApiResponse({ status: 500, description: "Lỗi server" })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    async filter(
        @Body() filterDto: AlertFilterDto,
        @CurrentUser() user: User
    ): Promise<PaginatedResponseDto<AlertResponseDto>> {
        return this.alertsService.findAllWithFilter(filterDto, user);
    }


    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: CreateAlertDto })
    async createAlert(@Body() createAlertDto: CreateAlertDto): Promise<AlertResponseDto> {
        return this.alertsService.create(createAlertDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, type: [AlertResponseDto] })
    async findAll(): Promise<AlertResponseDto[]> {
        return this.alertsService.findAll();
    }

    @Post('bulk')
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: [CreateAlertDto] })
    async createManyAlerts(@Body() createAlertDtos: CreateAlertDto[]): Promise<AlertResponseDto[]> {
        console.log('Received createManyAlerts request with data:', createAlertDtos);
        return this.alertsService.createManyAlerts(createAlertDtos);
    }

    @Post(':id/resolve')
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: UpdateAlertDto })
    @ApiParam({ name: 'id', description: 'ID of the alert to resolve' })
    @ApiResponse({ status: 200, type: AlertResponseDto })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    @Permissions(PermissionConstants.PERM_RESOLVE_ALERT)
    async resolveAlert(
        @Param('id') alertId: string,
        @Body() updateAlertDto: UpdateAlertDto,
        @CurrentUser() user: User
    ): Promise<AlertResponseDto> {
        return this.alertsService.resolveAlert(alertId, updateAlertDto, user);
    }

    @Post('/get-user-rfid-alerts/:roomId')
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'roomId', description: 'ID của phòng cần kiểm tra', required: true })
    @ApiResponse({ status: 200, type: [UserAlertResponseDto] })
    async getUserRfidAlerts(@Param('roomId') roomId: string, @Body() rfids: string[]): Promise<UserAlertResponseDto[]> {
        return this.alertsService.getUserRfidAlerts(rfids, roomId);
    }

    @Post('/update-alerts-image')
    @UseInterceptors(FileInterceptor('File'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                File: {
                    type: 'string',
                    format: 'binary',
                },
                alertIds: {
                    type: 'string',
                    description: 'JSON string array of alert IDs, e.g., ["id1","id2"]'
                }
            },
        },
    })
    async updateAlertsImage(
        @UploadedFile() file: Express.Multer.File,
        @Body('alertIds') alertIds: string
    ): Promise<void> {
        console.log('File received in controller:', file);
        console.log('alertIds received in controller:', alertIds);
        // Parse alertIds from string to array
        const parsedAlertIds = JSON.parse(alertIds);
        
        // Pass file and alertIds to service for processing
        await this.alertsService.updateAlertsImage(file, parsedAlertIds);
    }

    @Post('send-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Gửi email thông báo cảnh báo',
        description: 'Tìm tài sản trong sổ mới nhất, lấy đơn vị và phòng quản trị để gửi email cho users liên quan'
    })
    @ApiBody({ type: SendAlertEmailDto })
    @ApiResponse({ 
        status: 200, 
        description: 'Gửi email thành công',
        type: SendAlertEmailResponseDto 
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy cảnh báo' })
    @ApiResponse({ status: 500, description: 'Lỗi khi gửi email' })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    @Permissions(PermissionConstants.PERM_RESOLVE_ALERT)
    async sendAlertEmail(
        @Body() sendAlertEmailDto: SendAlertEmailDto
    ): Promise<SendAlertEmailResponseDto> {
        return this.alertsService.sendAlertEmail(sendAlertEmailDto.alertId);
    }

    @Post(':id/move')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Tạo yêu cầu di chuyển cho tài sản trong alert và phê duyệt ngay',
        description: 'Tạo yêu cầu di chuyển một tài sản phát hiện trong alert tới phòng được chọn, sau đó phê duyệt tự động bằng logic trong MovementsService'
    })
    @ApiParam({ name: 'id', description: 'ID của alert' })
    @ApiBody({ schema: { type: 'object', properties: { toRoomId: { type: 'string' }, note: { type: 'string' } } } })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @ApiBearerAuth()
    @Permissions(PermissionConstants.PERM_RESOLVE_ALERT)
    async moveAssetFromAlert(
        @Param('id') alertId: string,
        @Body('toRoomId') toRoomId: string,
        @Body('note') note: string,
        @CurrentUser() user: User,
    ) {
        return this.alertsService.moveAssetToRoom(alertId, toRoomId, note, user);
    }

}