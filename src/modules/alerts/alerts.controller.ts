import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AlertsService } from "./alerts.service";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { PermissionConstants } from "src/common/utils/permission.constant";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { AlertResponseDto } from "./dto/alert-response.dto";

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
}