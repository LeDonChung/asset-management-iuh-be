import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards, UseInterceptors, UploadedFile } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AlertsService } from "./alerts.service";
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

@ApiTags('Alerts')
@Controller('api/v1/alerts')
export class AlertsController {
    constructor(
        private readonly alertsService: AlertsService,
    ) { }


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
    async resolveAlert(
        @Param('id') alertId: string,
        @Body() updateAlertDto: UpdateAlertDto,
        @CurrentUser() user: User
    ): Promise<AlertResponseDto> {
        return this.alertsService.resolveAlert(alertId, updateAlertDto, user);
    }

    @Post('/get-user-rfid-alerts')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, type: [UserAlertResponseDto] })
    async getUserRfidAlerts(@Body() rfids: string[]): Promise<UserAlertResponseDto[]> {
        return this.alertsService.getUserRfidAlerts(rfids);
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


}