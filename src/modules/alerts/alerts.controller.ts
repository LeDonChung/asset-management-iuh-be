import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AlertsService } from "./alerts.service";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";
import { UpdateAlertDto } from "./dto/update-alert.dto";

@ApiTags('Alerts')
@Controller('api/v1/alerts')
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }


    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: CreateAlertDto })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_CREATE_USER)
    @ApiBearerAuth()
    async createAlert(@Body() createAlertDto: CreateAlertDto): Promise<AlertResponseDto> {
        return this.alertsService.create(createAlertDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, type: [AlertResponseDto] })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_VIEW_USER)
    @ApiBearerAuth()
    async findAll(): Promise<AlertResponseDto[]> {
        return this.alertsService.findAll();
    }

    @Post('bulk')
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: [CreateAlertDto] })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_CREATE_USER)
    @ApiBearerAuth()
    async createManyAlerts(@Body() createAlertDtos: CreateAlertDto[]): Promise<AlertResponseDto[]> {
        return this.alertsService.createManyAlerts(createAlertDtos);
    }

    @Post(':id/resolve')
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: UpdateAlertDto })
    @ApiParam({ name: 'id', description: 'ID of the alert to resolve' })
    @ApiResponse({ status: 200, type: AlertResponseDto })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_UPDATE_USER)
    @ApiBearerAuth()
    async resolveAlert(
        @Param('id') alertId: string,
        @Body() updateAlertDto: UpdateAlertDto,
        @CurrentUser() user: User
    ): Promise<AlertResponseDto> {
        return this.alertsService.resolveAlert(alertId, updateAlertDto, user);
    }
}