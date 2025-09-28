import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AlertsService } from "./alerts.service";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { AlertResponseDto } from "./dto/alert-response.dto";
import { CreateAlertResolutionDto } from "./dto/create-alert-resolution.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "src/entities/user.entity";
import { UserAlertResponseDto } from "./dto/user-alert-response.dto";

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

    @Post('resolve')
    @HttpCode(HttpStatus.CREATED)
    @ApiResponse({ status: 200, type: [AlertResponseDto] })
    @ApiBody({ type: CreateAlertResolutionDto })
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(PermissionConstants.PERM_CREATE_USER)
    @ApiBearerAuth()
    async createAlertResolution(
        @Body() createAlertResolutionDto: CreateAlertResolutionDto,
        @CurrentUser() currentUser: User
    ): Promise<AlertResponseDto> {
        return this.alertsService.createAlertResolution(createAlertResolutionDto, currentUser);
    }

    @Post('/get-user-rfid-alerts')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, type: [UserAlertResponseDto] })
    async getUserRfidAlerts(@Body() rfids: string[]): Promise<UserAlertResponseDto[]> {
        return this.alertsService.getUserRfidAlerts(rfids);
    }
}